import type { Request } from 'playwright';

import { ErrorMessage, type IndexOfURL, type ValidURL, ValueOfMap } from '@/utility/types/types';
import type { Note } from './Note';
import type { FileArchive } from './FileArchive';
import type { MainResultRecord, PageResultRecord } from '@/component/snapshot/JSON';

import { getRedirectStatusFromRequest } from './sub/getRedirectStatusFromRequest';
import { getResponseAndBodyFromRequest } from './sub/getResponseAndBodyFromRequest';


class PageResult {
  private record:Partial<PageResultRecord> = {}
  constructor(
    private url:ValidURL,
    private indexOfURL:IndexOfURL,
    private links:MainResultRecord["links"],
    private fileArchive:FileArchive,
  ){

  }
  getURL(){
    return this.url;
  }
  getIndexOfURL(){
    return this.indexOfURL;
  }
  async updateLinksFromRequestedURL(requestedURLInPage:string, targetRequest:Request, errorMessage:ErrorMessage){
    // リダイレクト後であればリダイレクト前の一番最初にリクエストしたURLを、リダイレクト無しであればそのままのURLを使用する
    const linksItem = this.links.get(requestedURLInPage);
    // ページから抽出されたURLとページからリクエストされたURLが重複した場合は、リクエストされたURLを優先する
    if(linksItem === undefined || linksItem["source"] === 'extracted'){
      const {body, response} = await getResponseAndBodyFromRequest(targetRequest);
      const linkSourceIndex = new Set<typeof this.indexOfURL>();
      linkSourceIndex.add(this.indexOfURL);
      const _result:Omit<ValueOfMap<MainResultRecord['links']>,'archiveIndex'> = {
        response,
        source: 'requestedFromPage',
        linkSourceIndex,
        errorMessage,
      }
      const _archiveIndex:Pick<ValueOfMap<MainResultRecord['links']>,'archiveIndex'> = {
        archiveIndex: null
      }
      /* ファイルのアーカイブを開始する */
      if(body !== null){
        _archiveIndex.archiveIndex = await this.fileArchive.archive({
          requestURL:requestedURLInPage,
          buffer: body,
          contentType: response?.contentType || '',
        });
      }
      this.links.set(requestedURLInPage, {..._result, ..._archiveIndex});
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
        response: {responseURL:null},
        source: 'extracted',
        linkSourceIndex,
        archiveIndex: null,
        errorMessage: '[request is pending]',
      })
    }else{
      linksItem.linkSourceIndex.add(this.indexOfURL);
    }
  }
  updateRecord(args:Pick<PageResultRecord, keyof PageResultRecord>){
    this.record = {...this.record, ...args};
  }
}

export { PageResult }