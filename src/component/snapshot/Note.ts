import path from 'path';
import fs from 'fs/promises';

import type { BrowserContext, Request } from 'playwright';
import { ValidURL, ScenarioFormFields } from "./ScenarioFormData";
import type { BrowserContextPickedFormFields } from "@/component/headlessBrowser/FormData";

import { getRedirectStatusFromRequest } from './sub/getRedirectStatusFromRequest';
import { getResponseAndBodyFromRequest } from './sub/getResponseAndBodyFromRequest';
import { type IndexOfURL, isIndexOfURL, type Entries } from '@/utility/Types';
import { VERSION } from '@/utility/getVersion';
import PQueue from 'p-queue';

import { setting } from "@/utility/Setting";

class NoteError extends Error{
  static {
    this.prototype.name = 'NoteError';
  }
}

// Todo:アプリのversionをpackage.jsonから取得して、取得データを一緒に記載する。

type ResponseResult = {
      /** リダイレクトを含む最終的な取得結果 */
      responseURL: string,
      /** リクエスト結果 */
      status: number,
      /** Content-Type */
      contentType: string,
      /** Content-Length */
      contentLength: number,
      /** ファイルのハッシュ値 */
      shaHash:string|null,
    } | {
      /** リダイレクトを含む最終的な取得結果 */
      responseURL: null,
      /** リクエスト結果 */
      status?: number,
      /** Content-Type */
      contentType?: string,
      /** Content-Length */
      contentLength?: number,
      /** ファイルのハッシュ値 */
      shaHash?:string|null,
    } | null;

/** リクエスト全体に共通する結果 */
type MainResultRecord = {
  formData:Omit<ScenarioFormFields & BrowserContextPickedFormFields, 'urlsToOpen'>,
  /** アプリのversion。package.jsonから取得 */
  version:string|null,
  /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
  targetURLs:Map<ValidURL, IndexOfURL>,
  /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL。updateLinksで更新する */
  links:Map<string, {
    response:ResponseResult,
    /** ページからのリクエストか、ページから抽出したURLか */
    source:'requestedFromPage'|'extracted',
    /** このURLへのアクセスが発生したページのindex */
    linkSourceIndex: Set<IndexOfURL>,
  }>,
};

/** ページごとの結果 */
type PageResultRecord = {
  'firstRequested'?:{
    url: ValidURL,
    redirect:null
  } | {
    url: ValidURL,
    redirect:{
      count:number|null,
      transition:{url:string,status:number}[],
    },
  },
  'URLRequestedFromPage'?:{
    /** このデータの説明文 */
    description:string,
    /** ページ内で使用されているURL */
    requestedURLs:string[],
  },
  'URLExtracted'?:{
    /** このデータの説明文 */
    description:string,
    /** ページ内に記述されているURL。相対・ルート相対・#始まりなどもあり */
    writtenURLs:({
      /** 取得できたURL */
      relURL:string[],
      absURL:(ValidURL|null)[]
    } & ({
      /** URLの取得元 */
      type:'DOM_Attribute',
      /** タグ名 */
      tagName:string,
    } | {
      /** URLの取得元 */
      type:'fromCascadingStyleSheets',
      /** CSSファイル */
      href:string|null,
    }))[]
  }
};

export type WrittenURLs = Required<PageResultRecord>['URLExtracted']["writtenURLs"];

/** 処理開始時に作成され、処理完了時に削除されるファイル */
const DOT_FILE_NAME = '.running' as const;

class Note{
  /** ページごとの結果にインデックスを付与したもの */
  private pageResults:Map<IndexOfURL, PageResultRecord> = new Map();
  /** リクエスト全体に共通する結果を格納する */
  private mainResult!:MainResultRecord;
  /** 結果を格納するディレクトリのパス */
  private occupiedDirectoryPath!:string;
  /** ファイルをアーカイブする */
  private fileArchive!:FileArchive;
  constructor(
    formData:Omit<ScenarioFormFields & BrowserContextPickedFormFields, 'urlsToOpen'>,
    urlsToOpen: ValidURL[],
    identifier:{
      apiType:string,
      contextId:string,
    }
  ){
    const _targetURLs:typeof this.mainResult["targetURLs"] = new Map();
    urlsToOpen.forEach((url, index)=>{
      const indexOfURL = index.toString().padStart(3,'0');
      if(isIndexOfURL(indexOfURL)){
        _targetURLs.set(url, indexOfURL);
        this.pageResults.set(indexOfURL, {});
      }else{
        throw new Error(`${indexOfURL}は数字のみで構成された文字列でなければいけません`);
      }
    });
    const _links:typeof this.mainResult["links"] = new Map();
    this.mainResult = {
      formData: formData,
      version: VERSION ?? null,
      targetURLs: _targetURLs,
      links: _links,
    }
    const [ymd, hash] = identifier.contextId.split('-');
    this.occupiedDirectoryPath = path.join(process.cwd(),`./_data/result/${identifier.apiType}/${ymd}/${hash}`);
  }

  async init(){
    for await (const indexOfURL of this.pageResults.keys()){
      await fs.mkdir(path.join(this.occupiedDirectoryPath, indexOfURL), {recursive:true});
    }
    await fs.writeFile(path.join(this.occupiedDirectoryPath, DOT_FILE_NAME),'');

    // ファイルのアーカイブ
    this.fileArchive = new FileArchive(this.occupiedDirectoryPath, this.mainResult.links);
    await this.fileArchive.init();
  }

  createPageResult(url:ValidURL){
    const indexOfURL = this.mainResult.targetURLs.get(url);
    if(indexOfURL === undefined){
      throw new NoteError(`${url}はtargetURLsに含まれていません`);
    }
    const pageResultRecord:PageResultRecord = {};
    this.pageResults.set(indexOfURL, pageResultRecord);
    return new PageResult(url, indexOfURL, this.mainResult.links, pageResultRecord, this.fileArchive);
  }

  async archiveNotRequestURL(context:BrowserContext|null){
    if(context===null){
      throw new NoteError(`無効なcontextが渡されました。init()が完了しているか確認してください`);
    }
    // 新しくPageを開いて、Page["goto"]で開く。on()で行うのでいつ書き込むは要検討。
    const queue = new PQueue({concurrency:3});
    // 保存前に未リクエストのURLについて、リクエストして必要ならアーカイブする
    queue.on('idle',async ()=>{
      await this.write();
      console.log(`処理結果を保存しました`);
    });
    for( const [requestURL, result] of  this.mainResult.links.entries()){
      if(result.response?.responseURL !== null){continue;}
      queue.add(async()=>{
        const page = await context.newPage();
        // Basic認証のアイパスの設定
        const authEncoded = setting.getBasicAuthorization(requestURL);
        if(authEncoded !== null){
          page.setExtraHTTPHeaders({...authEncoded});
        }
        // シナリオオプションはいったん無しで行う。
        try{
          page.on('requestfinished',async (request)=>{
            // リクエストURLのサーバーリダイレクトが終わって、ロード完了したらそれ以上は何もロードしない。
            const lastResponse = await request.response();
            if(lastResponse !== null){
              const lastRequested = lastResponse.request();
              const firstRequest = await getRedirectStatusFromRequest(lastRequested, false);
              if(firstRequest === requestURL && Math.floor(lastResponse.status()/100) !== 3){
                // console.log(`ドキュメント読み込み完了で記録 ${requestURL}`);
                const {body, response} = await getResponseAndBodyFromRequest(lastRequested);
                result.response = response;
                /* ファイルのアーカイブを開始する */
                if(body !== null){
                  this.fileArchive.archive({
                    requestURL,
                    buffer: body,
                  });
                }
                page.route('**/*',async (route)=>{
                  await route.abort();
                  // console.log(`${route.request().url()} is cancel.`)
                })
              }
            }
          })
          const pageResponse = await page.goto(requestURL, {waitUntil:'load'});
          if(pageResponse === null){
            result.response = null;
          }else{
            // console.log(`ページ読み込み完了で記録 ${requestURL}`);
            const {body, response} = await getResponseAndBodyFromRequest(pageResponse.request());
            result.response = response;
            /* ファイルのアーカイブを開始する */
            if(body !== null){
              this.fileArchive.archive({
                requestURL,
                buffer: body,
              });
            }
          }
        }catch(e){
          // console.log(`ページの読み込みでエラー`)
          // console.error(e);
          result.response = null;
        }
        await page.close();
      });
    }
  }

  async write(){
    // 全体の結果
    const fileHandleMain = await fs.open(this.occupiedDirectoryPath+'/main.json','ax');
    const recordMain:Partial<{[k in keyof MainResultRecord]:any}> = {}
    for (const [name, value] of Object.entries(this.mainResult) as Entries<typeof this.mainResult>){
      switch(name){
        case 'formData':
          recordMain[name] = value;
          break;
        case 'targetURLs':
          recordMain[name] = [];
          for(const [url, index] of value){
            recordMain[name].push([index, url]);
          }
          break;
        case 'links':
          recordMain[name] = []
          for(const [requestURL, response] of value){
            recordMain[name].push({
              requestURL: requestURL,
              ...response,
              linkSourceIndex:Array.from(response['linkSourceIndex']),
            })
          }
          break;
        default:
          recordMain[name] = value;
      }
    }
    await fileHandleMain.write(JSON.stringify(recordMain, null, '\t'));
    await fileHandleMain.close();
    // ページごとの結果
    for await(const [indexOfURL, record] of this.pageResults){
      const fileHandle = await fs.open(this.occupiedDirectoryPath + `/${indexOfURL}/page.json`, 'ax');
      fileHandle.write(JSON.stringify(record, null, '\t'));
      await fileHandle.close();
    }
    await fs.unlink(path.join(this.occupiedDirectoryPath, DOT_FILE_NAME));
  }
}

class PageResult {
  constructor(
    private url:ValidURL,
    private indexOfURL:IndexOfURL,
    private links:Note["mainResult"]["links"],
    public record:PageResultRecord,
    private fileArchive:FileArchive,
  ){
  }
  getURL(){
    return this.url;
  }
  async updateLinksFromRequestedURL(targetRequest:Request){
    // リダイレクト後であればリダイレクト前の一番最初にリクエストしたURLを、リダイレクト無しであればそのままのURLを使用する
    const requestedURLInPage = await getRedirectStatusFromRequest(targetRequest, false);
    const linksItem = this.links.get(requestedURLInPage);
    // ページから抽出されたURLとページからリクエストされたURLが重複した場合は、リクエストされたURLを優先する
    if(linksItem === undefined || linksItem["source"] === 'extracted'){
      const {body, response} = await getResponseAndBodyFromRequest(targetRequest);
      const linkSourceIndex = new Set<typeof this.indexOfURL>();
      linkSourceIndex.add(this.indexOfURL);
      this.links.set(requestedURLInPage, {
        response,
        source: 'requestedFromPage',
        linkSourceIndex,
      });
      /* ファイルのアーカイブを開始する */
      if(body !== null){
        this.fileArchive.archive({
          requestURL:requestedURLInPage,
          buffer: body,
        });
      }
    }else{
      linksItem.linkSourceIndex.add(this.indexOfURL);
    }
  }
  updateLinksFromExtractedURL(validURL:ValidURL){
    const linksItem = this.links.get(validURL);
    if(linksItem === undefined){
      const linkSourceIndex = new Set<typeof this.indexOfURL>();
      linkSourceIndex.add(this.indexOfURL);
      this.links.set(validURL,{
        response:{responseURL:null},
        source:'extracted',
        linkSourceIndex,
      })
    }else{
      linksItem.linkSourceIndex.add(this.indexOfURL);
    }
  }
}

class FileArchive{
  private storeDirectory:string;
  private counter:number = 1;
  private listOfFile:Map<string, number> = new Map();
  constructor(
    occupiedDirectoryPath:string,
    private links:Note["mainResult"]["links"],
  ){
    this.storeDirectory = path.join(occupiedDirectoryPath, '/archive');
  }
  async init(){
    await fs.mkdir(this.storeDirectory);
    return this;
  }
  async archive(args:{
    requestURL:string,
    buffer:Buffer
  }){
    const {requestURL, buffer} = args;
    const linksItem = this.links.get(requestURL);
    if(linksItem===undefined){
      console.error(`${requestURL}はlinksに含まれていません`)
      return null;
    }
    // 既にファイルのアーカイブとそのハッシュ値の取得が開始していたら
    if(this.listOfFile.get(requestURL)!==undefined){
      return null;
    }
    const targetPath = path.join(this.storeDirectory, this.counter.toString());
    this.listOfFile.set(requestURL, this.counter);
    this.counter++;
    // bufferがあるときはrequestが完了していて、responseBodyがあると判断
    const fileHandle = await fs.open(targetPath, 'ax');
    await fileHandle.write(buffer);
    await fileHandle.close();
    return null;
  }
}

export { Note };