import type { Request } from 'playwright';

import { type IndexOfURL, type ValidURL } from '@/utility/types/types';
import type { Note } from './Note';
import type { FileArchive } from './FileArchive';
import type { LinksItem, PageResultRecord } from '@/component/snapshot/JSON';

import { getRedirectStatusFromRequest } from './sub/getRedirectStatusFromRequest';
import { getResponseAndBodyFromRequest } from './sub/getResponseAndBodyFromRequest';


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