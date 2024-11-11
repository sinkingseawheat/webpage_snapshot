import path from 'path';
import fs from 'fs/promises';

import type { BrowserContext, Request } from 'playwright';
import { ValidURL, ScenarioFormFields } from "./FormData";
import type { BrowserContextPickedFormFields } from "@/component/headlessBrowser/FormData";
import { PageResult, type PageResultRecord } from './PageResult';
import { FileArchive } from './FileArchive';
import { type IndexOfURL, isIndexOfURL, type Entries } from '@/utility/Types';
import { VERSION } from '@/utility/getVersion';
import PQueue from 'p-queue';

import { requestNotRequestedButInPage } from './sub/requestNotRequestedButInPage';

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


export type LinksItem = {
  response:ResponseResult,
  /** ページからのリクエストか、ページから抽出したURLか */
  source:'requestedFromPage'|'extracted',
  /** このURLへのアクセスが発生したページのindex */
  linkSourceIndex: Set<IndexOfURL>,
}


/** リクエスト全体に共通する結果 */
type MainResultRecord = {
  formData:Omit<ScenarioFormFields & BrowserContextPickedFormFields, 'urlsToOpen'>,
  /** アプリのversion。package.jsonから取得 */
  version:string|null,
  /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
  targetURLs:Map<ValidURL, IndexOfURL>,
  /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL。updateLinksで更新する */
  links:Map<string, LinksItem>,
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
    const promises:Promise<string | undefined>[] = []
    for (const indexOfURL of this.pageResults.keys()){
      promises.push(fs.mkdir(this.getPageResultPath(indexOfURL,''), {recursive:true}));
    }
    await Promise.all(promises)
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
    const notRequestedQueue = new PQueue({concurrency:3});
    notRequestedQueue.on('idle',async ()=>{
      await this.write();
      console.log(`処理結果を保存しました`);
      await fs.unlink(path.join(this.occupiedDirectoryPath, DOT_FILE_NAME));
      onAllScenarioEnd();
    });
    // 保存前に未リクエストのURLについて、リクエストして必要ならアーカイブする
    for( const [requestURL, result] of  this.mainResult.links.entries()){
      if(result.response?.responseURL !== null){continue;}
      notRequestedQueue.add(async ()=>{
        await requestNotRequestedButInPage(await context.newPage(), requestURL, result, this.fileArchive);
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
  }

  async writePageResult(arg:{indexOfURL:IndexOfURL, pageResultRecord:PageResultRecord}){
    const {indexOfURL, pageResultRecord} = arg;
    // ページJSONを書き込み
    const fileHandle = await fs.open(this.getPageResultPath(indexOfURL,'page.json'), 'ax');
    const jsonStored:Pick<PageResultRecord,'firstRequested'|'URLRequestedFromPage'|'URLExtracted'> = {
      firstRequested: pageResultRecord['firstRequested'],
      URLRequestedFromPage: pageResultRecord['URLRequestedFromPage'],
      URLExtracted: pageResultRecord['URLExtracted'],
    };
    fileHandle.write(JSON.stringify(jsonStored, null, '\t'));
    await fileHandle.close();
    // キャプチャを格納
    for(const capture of pageResultRecord['PageCapture'] ?? []){
      await fs.writeFile(this.getPageResultPath(indexOfURL,`capture_${capture['name']}.jpg`), capture["buffer"], {flag:'ax'});
    }
    // DOMテキストを格納
    if(pageResultRecord['DOM']?.source !== undefined){
      await fs.writeFile(this.getPageResultPath(indexOfURL,'document_object_model.txt'), pageResultRecord['DOM'].source, {flag:'ax'});
    }
    this.pageResults.delete(indexOfURL);
  }
}


export { Note };