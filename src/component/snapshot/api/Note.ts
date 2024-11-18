import path from 'path';
import fs from 'fs/promises';

import type { BrowserContext } from 'playwright';
import { ValidURL } from "@/utility/types/types";
import { PageResult } from './PageResult';
import { FileArchive } from './FileArchive';
import { type IndexOfURL, isIndexOfURL, type Entries, DOT_FILE_PROCESS_COMPLETED } from '@/utility/types/types';
import { type PageResultRecord, type MainResultRecord } from '@/component/snapshot/JSON';
import { VERSION } from '@/utility/getVersion';
import PQueue from 'p-queue';

import { requestNotRequestedButInPage } from './sub/requestNotRequestedButInPage';

class NoteError extends Error{
  static {
    this.prototype.name = 'NoteError';
  }
}



const directoryStoringResult = path.join(process.cwd(),`./_data/result`);

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
    formData :MainResultRecord["formData"],
    urlsToOpen: ValidURL[],
    identifier: {
      apiType: string,
      jobId: string,
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
    const [ymd, hash] = identifier.jobId.split('-');
    this.occupiedDirectoryPath = path.join(directoryStoringResult,`${identifier.apiType}/${ymd}/${hash}`);
  }

  private getPageResultPath = (indexOfURL:IndexOfURL, suffix:string) => path.join(this.occupiedDirectoryPath, indexOfURL, suffix);

  async init(){
    const promises:Promise<string | undefined>[] = []
    for (const indexOfURL of this.pageResults.keys()){
      promises.push(fs.mkdir(this.getPageResultPath(indexOfURL,''), {recursive:true}));
    }
    await Promise.all(promises)

    // ファイルのアーカイブ
    this.fileArchive = new FileArchive(this.occupiedDirectoryPath);
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
      await fs.writeFile(path.join(this.occupiedDirectoryPath, DOT_FILE_PROCESS_COMPLETED), '');
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
          for(const [requestURL, linksItem] of value){
            const { responseURL, status, contentType, contentLength, shaHash } = linksItem["response"] ?? {};
            recordMain[name].push({
              requestURL: requestURL,
              responseURL,
              status,
              contentType,
              contentLength,
              shaHash,
              linkSourceIndex: Array.from(linksItem['linkSourceIndex']),
              archiveIndex: linksItem['archiveIndex'],
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