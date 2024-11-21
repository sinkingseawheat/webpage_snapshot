import { type IndexOfURL, type ValidURL, } from '@/utility/types/types';
import { getPageResultRecordJSON, type PageResultRecord } from '@/component/snapshot/JSON';

import fs from 'fs/promises';
import path from 'path';

class PageResult {
  private record:Partial<PageResultRecord> = {}
  constructor(
    private targetURL:ValidURL,
    private indexOfURL:IndexOfURL,
    private occupiedDirectoryPath:string
  ){
  }
  updateRecord(args:Partial<Pick<PageResultRecord, keyof PageResultRecord>>){
    this.record = {...this.record, ...args};
  }
  async dumpJSON(){
    const pageResultRecord:PageResultRecord = {
      ...{
        redirectTransition:[],
        URLsRequestFromPage:[],
        DOMtext:null,
        URLsExtracted:[],
        pageCapture:[]
      },
      ...this.record
    };
    const jsonData = getPageResultRecordJSON(pageResultRecord);
    try{
      await fs.mkdir(path.join(this.occupiedDirectoryPath, this.indexOfURL), {recursive:true});
      await fs.writeFile(path.join(this.occupiedDirectoryPath, this.indexOfURL, 'page.json'), JSON.stringify(jsonData, null, '\t'), {flag:'ax'});
    }catch(e){
      console.error(e);
      throw e;
    }
  }
  async storeCapture(){
    const {pageCapture} = this.record;
    if(Array.isArray(pageCapture)){
      await fs.mkdir(path.join(this.occupiedDirectoryPath, this.indexOfURL), {recursive:true});
      Promise.all(pageCapture.map(
        (capture) => fs.writeFile(path.join(this.occupiedDirectoryPath, this.indexOfURL, `${capture.name}`), capture.buffer, {flag:'ax'})
      ));
    }
  }
}

export { PageResult }