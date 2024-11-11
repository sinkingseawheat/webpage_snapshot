import path from 'path';
import fs from 'fs/promises';

import type { BrowserContext, Request } from 'playwright';
import { ValidURL, ScenarioFormFields } from "./ScenarioFormData";
import type { BrowserContextPickedFormFields } from "@/component/headlessBrowser/FormData";
import { PageResult, type PageResultRecord } from './PageResult';
import { FileArchive } from './FileArchive';

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


/** 未リクエストの場合はnull。それ以外はオブジェクト */
type ResponseResult = {
  /** 通信が完了したらURL入れる。ただし、タイムアウトなどでレスポンスが得られなかったらnull */
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
  /** 通信が完了したらURL入れる。ただし、タイムアウトなどでレスポンスが得られなかったらnull */
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

export type WrittenURLs = Required<PageResultRecord>['URLExtracted'];

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

  private getPageResultPath = (indexOfURL:IndexOfURL, suffix:string) => path.join(this.occupiedDirectoryPath, indexOfURL, suffix);

  async init(){
    for await (const indexOfURL of this.pageResults.keys()){
      await fs.mkdir(this.getPageResultPath(indexOfURL,''), {recursive:true});
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

  async archiveNotRequestURL(context:BrowserContext|null, onAllScenarioEnd:()=>void){
    if(context===null){
      throw new NoteError(`無効なcontextが渡されました。init()が完了しているか確認してください`);
    }
    const queue = new PQueue({concurrency:3});
    queue.on('idle',async ()=>{
      await this.write();
      console.log(`処理結果を保存しました`);
      await fs.unlink(path.join(this.occupiedDirectoryPath, DOT_FILE_NAME));
      onAllScenarioEnd();
    });
    // 保存前に未リクエストのURLについて、リクエストして必要ならアーカイブする
    for( const [requestURL, result] of  this.mainResult.links.entries()){
      if(result.response?.responseURL !== null){continue;}
      queue.add(async()=>{
        const page = await context.newPage();
        try{
          // page["route"]はリダイレクトによる再リクエストには反映されないらしいので、これで問題ないはず
          await page.route('**/*',(route, request)=>{
            if(request.url() !== requestURL){
              route.abort();
            }else{
              route.continue();
            }
          });
          // Basic認証のアイパスの設定
          const authEncoded = setting.getBasicAuthorization(requestURL);
          if(authEncoded !== null){
            page.setExtraHTTPHeaders({...authEncoded});
          }
          // シナリオオプション（referer）はいったん無しで行う。
          let redirectCount = 0;
          page.on('response', ()=>{
            if(redirectCount>=10){
              throw new NoteError(`[too many redirects] リダイレクト数が多すぎます`)
            }
            redirectCount++;
          })
          page.on('requestfinished',(request)=>{
            (async ()=>{
              try{
                // リクエストURLのサーバーリダイレクトが終わって、ロード完了したらそれ以上は何もロードしない。
                const lastResponse = await request.response();
                if(lastResponse !== null){
                  const lastRequested = lastResponse.request();
                  const firstRequest = await getRedirectStatusFromRequest(lastRequested, false);
                  if(
                    firstRequest === requestURL
                    && Math.floor(lastResponse.status()/100) !== 3
                  ){
                    const {body, response} = await getResponseAndBodyFromRequest(lastRequested);
                    console.log(`${requestURL} の確認が完了しました： ${response?.status}`)
                    result.response = response;
                    if(body !== null){
                      this.fileArchive.archive({
                        requestURL,
                        buffer: body,
                        contentType: response?.contentType || '',
                      });
                    }
                  }
                }
              }catch(e){
                // request送信→ページクローズ→requestfinishedの場合
                throw new NoteError(`[page has closed before requestfinished] リクエストが完了する前にページが閉じられました`)
              }
            })();
          });
          const pageResponse = await page.goto(requestURL, {waitUntil:'load', timeout:5000});
          if(pageResponse === null){
            result.response = null;
          }else{
            const {body, response} = await getResponseAndBodyFromRequest(pageResponse.request());
            result.response = response;
            if(body !== null){
              this.fileArchive.archive({
                requestURL,
                buffer: body,
                contentType: response?.contentType || '',
              });
            }
          }
        }catch(e){
          if(e instanceof Error){
            if(e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
              // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
              result.response = {
                  responseURL: null,
                  status: 401,
                  contentType: '',
                  contentLength: -1,
                  shaHash:null,
              }
            }else if(e.message.indexOf('[page has closed before requestfinished]') !== -1){
              console.log(`[page has closed before requestfinished] ${requestURL}`);
              result.response = null;
            }else if(e.message.indexOf('[too many redirects]') !== -1){
              console.log(`[too many redirects] ${requestURL}`);
              result.response = null;
            }else if(e.message.indexOf('Target page, context or browser has been closed') !== -1){
              // ブラウザを手動で閉じたとみなすため、強制終了。
              console.error(e);
              console.log('強制終了します')
              process.exit(-1);
            }else{
              result.response = null;
            }
          }
        }finally{
          await page.close();
        }
      });
    }
  }

  async write(){
    // アーカイブしたファイルのリストを書き込む
    await this.fileArchive.finish();
    // 全体の結果
    const fileHandleMain = await fs.open(this.occupiedDirectoryPath+'/__main.json','ax');
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
      const fileHandle = await fs.open(this.getPageResultPath(indexOfURL,'page.json'), 'ax');
      const jsonStored:Pick<PageResultRecord,'firstRequested'|'URLRequestedFromPage'|'URLExtracted'> = {
        firstRequested: record['firstRequested'],
        URLRequestedFromPage: record['URLRequestedFromPage'],
        URLExtracted: record['URLExtracted'],
      };
      fileHandle.write(JSON.stringify(jsonStored, null, '\t'));
      await fileHandle.close();
      // キャプチャを格納
      for(const capture of record['PageCapture'] ?? []){
        await fs.writeFile(this.getPageResultPath(indexOfURL,`capture_${capture['name']}.jpg`), capture["buffer"], {flag:'ax'});
      }
      // DOMテキストを格納
      if(record['DOM']?.source !== undefined){
        await fs.writeFile(this.getPageResultPath(indexOfURL,'document_object_model.txt'), record['DOM'].source, {flag:'ax'});
      }
    }
  }
}


export { Note };