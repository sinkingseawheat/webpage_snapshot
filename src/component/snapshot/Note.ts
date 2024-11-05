import path from 'path';
import fs from 'fs/promises';

import { BrowserContextOptions } from "playwright";
import type { Request } from 'playwright';
import { ValidURL } from "./ScenarioFormData";

import type { Entries } from '@/utility/Types';

class NoteError extends Error{
  static {
    this.prototype.name = 'NoteError';
  }
}

declare const IndexOfURLNormality: unique symbol;
/* ブラウザで読み込む対象URLと1対1で紐づいた、'010'など数字のみで構成された文字列 */
type IndexOfURL = string & {
  IndexOfURLNormality: never,
}
const isIndexOfURL = (arg:string):arg is IndexOfURL => {
  return /^\d+$/.test(arg);
}

// Todo:アプリのversionをpackage.jsonから取得して、取得データを一緒に記載する。

/** ページごとの結果 */
type PageResultRecord = {[k:string]:any};

type ResponseRequestedInPage = {
  /** リダイレクトを含む最終的な取得結果 */
  responseURL: string|null,
  /** リクエスト結果 */
  status: number|null,
  /** このURLへのアクセスが発生したページのindex */
  linkSourceIndex: Set<IndexOfURL>
};

class Note{
  /** ページごとの結果にインデックスを付与したもの */
  private pageResults:Map<IndexOfURL, PageResultRecord> = new Map();
  /** リクエスト全体に共通する結果を格納する */
  private mainResult!:{
    bcOption:BrowserContextOptions,
    /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
    targetURLs:Map<ValidURL, IndexOfURL>,
    /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL */
    links:Map<string, ResponseRequestedInPage>,
  };
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
    for await(const [indexOfURL, record] of this.pageResults){
      const fileHandle = await fs.open(this.occupiedDirectoryPath + `/${indexOfURL}.json`, 'ax');
      fileHandle.write(JSON.stringify(record, null, '\t'));
      await fileHandle.close();
    }
  }

  async archiveFile(pathname:string, ){}
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
  async updateLinks(finallyRequested:Request){
    // リダイレクト後であればリダイレクト前の一番最初にリクエストしたURLを、リダイレクト無しまたはリクエスト前であればそのままのURLを使用する
    const requestedURLInPage = (()=>{
      let redirectCount = 0;
      let prevRequest = finallyRequested.redirectedFrom();
      let url = finallyRequested.url();
      while(prevRequest!==null && redirectCount < 10){
        url = prevRequest.url();
        prevRequest = prevRequest?.redirectedFrom() || null;
        redirectCount++;
      }
      return url;
    })();
    const responseRequestedInPage = this.links.get(requestedURLInPage);
    if(responseRequestedInPage === undefined){
      const _response = await finallyRequested.response();
      const _responseURL = _response?.url() ?? null;
      const _status = _response?.status() ?? null;
      const _indexOfURL = new Set<typeof this.indexOfURL>();
      _indexOfURL.add(this.indexOfURL)
      this.links.set(requestedURLInPage, {
        responseURL: _responseURL,
        status: _status,
        linkSourceIndex: _indexOfURL,
      });
    }else{
      responseRequestedInPage.linkSourceIndex.add(this.indexOfURL);
    }
  }
}

export { Note };