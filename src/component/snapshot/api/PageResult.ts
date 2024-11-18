import type { Request } from 'playwright';

import { type IndexOfURL } from '@/utility/types/types';
import { ValidURL } from "../FormData";
import type { Note } from './Note';
import type { FileArchive } from './FileArchive';
import type { LinksItem } from './Note';

import { getRedirectStatusFromRequest } from './sub/getRedirectStatusFromRequest';
import { getResponseAndBodyFromRequest } from './sub/getResponseAndBodyFromRequest';

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
    /** ページ内で使用されているURL */
    requestedURLs:string[],
  },
  /** ページのDOM */
  'DOM'?:{
    source:string,
  }
  /** ページ内に記述されているURL。 */
  'URLExtracted'?:({
    /** 取得できたURL。相対・ルート相対・#始まりなども含む */
    relURL:string[],
    /** relURLを取得したページのURLを基に絶対パス化 */
    absURLs:(ValidURL|null)[]
  } & ({
    /** URLの取得元。DOM要素から */
    type:'DOM_Attribute',
    /** タグ名 */
    tagName:string,
  } | {
    /** URLの取得元。CSSから */
    type:'fromCascadingStyleSheets',
    /** CSSファイル。nullの場合はHTMLのインラインstyle */
    href:string|null,
  } | {
    /** URLの取得元。style属性から */
    type:'styleAttribute',
  }))[]
  /** キャプチャ */
  'PageCapture'?:{
    name: string,
    buffer: Buffer,
  }[]
};

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
  getIndexOfURL(){
    return this.indexOfURL;
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
      const result:LinksItem = {
        response,
        source: 'requestedFromPage',
        linkSourceIndex,
      }
      /* ファイルのアーカイブを開始する */
      if(body !== null){
        await this.fileArchive.archive({
          requestURL:requestedURLInPage,
          buffer: body,
          contentType: response?.contentType || '',
          result,
        });
      }
      this.links.set(requestedURLInPage, result);
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

export { PageResult }
export type { PageResultRecord }