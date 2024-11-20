import type { BrowserContext, Page, Request } from "playwright";
import { defaultFormFieldValues } from "../FormData";
import { MainResultRecord } from "../JSON";
import { ErrorMessage, IndexOfURL, isIndexOfURL, isValidURL, ValidURL, DOT_FILE_PROCESS_COMPLETED, ValueOfMap } from "@/utility/types/types";
import { VERSION } from '@/utility/getVersion';
import { getResponseAndBodyFromRequest } from "./sub/getResponseAndBodyFromRequest";
import { setting } from "@/utility/Setting";
import { getMainResultRecordJSON } from "../JSON";
import fs from 'fs/promises';
import path from 'path';
import PQueue from "p-queue";
import { requestNotRequestedButInPage } from "./sub/requestNotRequestedButInPage";

type FormData = typeof defaultFormFieldValues;

class MainResultError extends Error{
  static {
    this.prototype.name = `MainResultError`;
  }
}

class MainResult{
  private indexOfURLCounter = 0;
  private archiveIndexCounter = 0;
  private record!:MainResultRecord;
  constructor(
    formDataExcluded:Omit<FormData,'urlsToOpen'>,
    private occupiedDirectoryPath:string
  ){
    this.record = {
      formData: formDataExcluded,
      version: VERSION ?? null,
      targetURLs: new Map(),
      links: new Map(),
    }
  }
  addTargetURL(url:string):IndexOfURL|null{
    if(isValidURL(url)){
      const indexOfURL = this.indexOfURLCounter.toString().padStart(3,'0');
      if(isIndexOfURL(indexOfURL)){
        this.record.targetURLs.set(url, indexOfURL);
        this.indexOfURLCounter++;
        return indexOfURL;
      }else{
        return null;
      }
    }else{
      return null;
    }
  }
  getIndexOfURL(targetURL:string){
    if(isValidURL(targetURL)){
      return this.record['targetURLs'].get(targetURL);
    }
    return null;
  }
  async updateLinks(args:{targetURL:ValidURL, requestURLFromPage:ValidURL, request:Request|null, errorMessage:ErrorMessage}):Promise<void>;
  async updateLinks(args:{targetURL:ValidURL, requestURLFromPage:ValidURL}):Promise<void>;
  async updateLinks(args:{targetURL:ValidURL, requestURLFromPage:ValidURL, request?:Request|null, errorMessage?:ErrorMessage}){
    const {targetURL, requestURLFromPage, request, errorMessage} = args;
    const linksItem = this.record.links.get(requestURLFromPage);
    const indexOfURL = this.getIndexOfURL(targetURL);
    if(indexOfURL === undefined){
      throw new MainResultError(`${requestURLFromPage}はtargetURLsに含まれていません`);
    }else if(indexOfURL === null){
      throw new MainResultError(`${requestURLFromPage}は有効なURLではありません`);
    }
    if(request===undefined || errorMessage===undefined){
      // extractedLink
      if(linksItem === undefined){
        const linkSourceIndex = new Set<typeof indexOfURL>();
        linkSourceIndex.add(indexOfURL);
        this.record.links.set(requestURLFromPage, {
          response: {responseURL:null},
          source: 'extracted',
          linkSourceIndex,
          archiveIndex: null,
          errorMessage: '[request is pending]',
        })
      }else{
        linksItem.linkSourceIndex.add(indexOfURL);
      }
    }else{
      // requestedFromPage
      // ページから抽出されたURLとページからリクエストされたURLが重複した場合は、リクエストされたURLを優先する
      if(linksItem === undefined || linksItem["source"] === 'extracted'){
        const linkSourceIndex = linksItem?.linkSourceIndex ?? new Set();
        linkSourceIndex.add(indexOfURL);
        const {body, response} = request === null ? {body:null, response:null} : await getResponseAndBodyFromRequest(request);
        const archiveIndex = (body !== null) ? await this.archiveFile(requestURLFromPage, body) : null;
        // ページの通信は正常に終了して、ページからのリクエストが失敗してresponse.bodyが無い場合のみ表示されるエラーメッセージ。
        const _errorMessage = (body !== null) ? '' : '[no responseBody found request from page]';
        this.record.links.set(requestURLFromPage, {
          response,
          source: 'requestedFromPage',
          linkSourceIndex,
          errorMessage: errorMessage==='' ? _errorMessage : errorMessage,
          archiveIndex,
        })
      }else{
        linksItem.linkSourceIndex.add(indexOfURL);
      }
    }
  }
  async archiveFile(requestURLFromPage:ValidURL, buffer:Buffer):Promise<number|null>{
    if(!setting.isAllowedArchiveURL(requestURLFromPage)){return null}
    const index = this.archiveIndexCounter;
    this.archiveIndexCounter++;
    try{
      await fs.mkdir(path.join(this.occupiedDirectoryPath, `archive`), {recursive:true});
      await fs.writeFile(path.join(this.occupiedDirectoryPath, `archive/${index}`), buffer, {flag:'ax'});
    }catch(e){
      console.error(`${path.join(this.occupiedDirectoryPath, `archive/${index}`)}への書き込みに失敗しました`);
      throw e;
    }
    return  index;
  }

  async requestRemainedURL(args:{
    browserContext: BrowserContext,
    handleFinishRequestRemainedURL: () => Promise<void>
  }){
    const {browserContext, handleFinishRequestRemainedURL} = args;
    const notRequestedQueue = new PQueue({concurrency:3});

    notRequestedQueue.on('idle',async ()=>{
      await handleFinishRequestRemainedURL();
      await fs.mkdir(path.join(this.occupiedDirectoryPath), {recursive:true});
      await fs.writeFile(path.join(this.occupiedDirectoryPath, DOT_FILE_PROCESS_COMPLETED), '');
    });

    // 保存前に未リクエストのURLについて、リクエストして必要ならアーカイブする
    for( const [requestURLFromPage, linksItemOfRequestURLFromPage] of  this.record.links.entries()){
      if(linksItemOfRequestURLFromPage.response?.responseURL !== null){continue;}
      notRequestedQueue.add(async ()=>{
        if(isValidURL(requestURLFromPage)){
          const result = await requestNotRequestedButInPage({
            browserContext:browserContext,
            requestURLFromPage
          });
          const archiveIndex = result.buffer ? await this.archiveFile(requestURLFromPage, result.buffer) : null;
          const updatedLinksItem = {
            ...linksItemOfRequestURLFromPage,
            ...result.updatedLinksItem,
            ...{archiveIndex}
          }
          this.record.links.set(requestURLFromPage, updatedLinksItem);
        }else{
          throw new Error(`${requestURLFromPage}は無効なURLです`);
        }
      });
    }
  }

  async dumpJSON(){
    const pageResultRecord:MainResultRecord = this.record;
    const jsonData = getMainResultRecordJSON(pageResultRecord);
    try{
      await fs.mkdir(path.join(this.occupiedDirectoryPath), {recursive:true});
      await fs.writeFile(path.join(this.occupiedDirectoryPath, 'main.json'), JSON.stringify(jsonData, null, '\t'), {flag:'ax'});
    }catch(e){
      console.error(e);
      throw e;
    }
  }
}

export { MainResult }