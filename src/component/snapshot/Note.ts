import path from 'path';
import fs from 'fs/promises';

import { BrowserContextOptions } from "playwright";
import type { Request } from 'playwright';
import { ValidURL } from "./ScenarioFormData";

import { type IndexOfURL, isIndexOfURL, type Entries } from '@/utility/Types';

class NoteError extends Error{
  static {
    this.prototype.name = 'NoteError';
  }
}

// Todo:アプリのversionをpackage.jsonから取得して、取得データを一緒に記載する。

type ResponseResult = {
      /** リダイレクトを含む最終的な取得結果 */
      responseURL: string|null,
      /** リクエスト結果 */
      status: number|null,
      /** Content-Type */
      contentType: string|null,
      /** Content-Length */
      contentLength: number|null,
      /** ファイルのハッシュ値 */
      // hash:string,
} | null;

/** リクエスト全体に共通する結果 */
type MainResultRecord = {
  bcOption:BrowserContextOptions,
  /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
  targetURLs:Map<ValidURL, IndexOfURL>,
  /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL。updateLinksで更新する */
  links:Map<string, {
    response:ResponseResult,
    /** ページからのリクエストか、ページから抽出したURLか */
    source:'formPage'|'extractored',
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
    relativeURLs:string[],
  },
  'URLExtractored'?:{
    /** このデータの説明文 */
    description:string,
    /** ページ内に記述されているURL。相対・ルート相対・#始まりなどもあり */
    relativeURLs:({
      /** 取得できたURL */
      url:string[],
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

export type RelativeURLs = Required<PageResultRecord>['URLExtractored']["relativeURLs"];

/** 処理開始時に作成され、処理完了時に削除されるファイル */
const DOT_FILE_NAME = '.running' as const;

class Note{
  /** ページごとの結果にインデックスを付与したもの */
  private pageResults:Map<IndexOfURL, PageResultRecord> = new Map();
  /** リクエスト全体に共通する結果を格納する */
  private mainResult!:MainResultRecord;
  /** 結果を格納するディレクトリのパス */
  private occupiedDirectoryPath!:string;
  constructor(
    bcoption:BrowserContextOptions,
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
      bcOption: bcoption,
      targetURLs: _targetURLs,
      links: _links,
    }
    const [ymd, hash] = identifier.contextId.split('-');
    this.occupiedDirectoryPath = path.join(process.cwd(),`./_data/result/${identifier.apiType}/${ymd}/${hash}`);
  }

  async init(){
    await fs.mkdir(this.occupiedDirectoryPath, {recursive:true});
    await fs.writeFile(path.join(this.occupiedDirectoryPath, DOT_FILE_NAME),'');
  }

  createPageResult(url:ValidURL){
    const indexOfURL = this.mainResult.targetURLs.get(url);
    if(indexOfURL === undefined){
      throw new NoteError(`${url}はtargetURLsに含まれていません`);
    }
    const pageResultRecord:PageResultRecord = {};
    this.pageResults.set(indexOfURL, pageResultRecord);
    return new PageResult(url, indexOfURL, this.mainResult.links, pageResultRecord);
  }

  async write(){
    // 全体の結果
    const fileHandleMain = await fs.open(this.occupiedDirectoryPath+'/__main.json','ax');
    const recordMain:any = {}
    for (const [name, value] of Object.entries(this.mainResult) as Entries<typeof this.mainResult>){
      switch(name){
        case 'bcOption':
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
      }
    }
    await fileHandleMain.write(JSON.stringify(recordMain, null, '\t'));
    await fileHandleMain.close();
    // ページごとの結果
    for await(const [indexOfURL, record] of this.pageResults){
      const fileHandle = await fs.open(this.occupiedDirectoryPath + `/${indexOfURL}.json`, 'ax');
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
  ){
  }
  getURL(){
    return this.url;
  }
  async updateLinks(targetRequest:Request){
    // リダイレクト後であればリダイレクト前の一番最初にリクエストしたURLを、リダイレクト無しまたはリクエスト前であればそのままのURLを使用する
    const requestedURLInPage = (()=>{
      let redirectCount = 0;
      let prevRequest = targetRequest.redirectedFrom();
      let url = targetRequest.url();
      while(prevRequest!==null && redirectCount < 10){
        url = prevRequest.url();
        prevRequest = prevRequest?.redirectedFrom() || null;
        redirectCount++;
      }
      return url;
    })();
    const responseRequestedInPage = this.links.get(requestedURLInPage);
    if(responseRequestedInPage === undefined){
      const _response = await targetRequest.response();
      const response:ResponseResult = await(async ()=>{
        if(_response === null){return null;}
        const responseURL = _response.url();
        const status = _response.status();
        const responseHeaders = await _response.allHeaders();
        const contentType = responseHeaders['content-type'];
        const contentLengthBeforeParse = responseHeaders['content-length'];
        const contentLength = contentLengthBeforeParse === null ? null : parseInt(contentLengthBeforeParse);
        return{
          responseURL,
          status,
          contentType,
          contentLength,
        }
      })();
      const _indexOfURL = new Set<typeof this.indexOfURL>();
      _indexOfURL.add(this.indexOfURL);
      this.links.set(requestedURLInPage, {
        response,
        source: 'formPage',
        linkSourceIndex: _indexOfURL,
      });
    }else{
      responseRequestedInPage.linkSourceIndex.add(this.indexOfURL);
    }
  }
}

class ArchiveFile{
  constructor(occupiedDirectoryPath:string){}
}

export { Note };