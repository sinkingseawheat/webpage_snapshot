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
        URLsRequestedFromPage:[],
        DOMtext:null,
        URLsExtracted:[],
        pageCapture:[]
      },
      ...this.record
    };
    const jsonData = getPageResultRecordJSON(pageResultRecord);
    try{
      await fs.mkdir(path.join(this.occupiedDirectoryPath, this.indexOfURL), {recursive:true});
      fs.writeFile(path.join(this.occupiedDirectoryPath, this.indexOfURL, 'page.json'), JSON.stringify(jsonData, null, '\t'), {flag:'ax'});
    }catch(e){
      console.error(e);
      throw e;
    }
  }
}

export { PageResult }