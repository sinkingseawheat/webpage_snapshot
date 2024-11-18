
import fs from 'fs/promises';
import path from 'path';
import type { LinksItem, Note } from './Note';
import { setting } from '@/utility/Setting';

class FileArchiveError extends Error {
  static {
    this.prototype.name = 'FileArchiveError';
  }
}

class FileArchive{
  private storeDirectory:string;
  private counter:number = 1;
  private state:'created'|'initiated'|'closed' = 'created';
  private recordOfStartedArchiveURL:Map<string, {index:number, contentType:string}> = new Map()
  constructor(
    occupiedDirectoryPath:string,
  ){
    this.storeDirectory = path.join(occupiedDirectoryPath, '/archive');
  }
  async init(){
    if(this.state !== 'created'){
      throw new FileArchiveError(`init()に失敗しました。${this.state}がcreatedではありません`);
    }
    await fs.mkdir(this.storeDirectory);
    this.state = 'initiated';
    return this;
  }
  async archive(args:{
    requestURL:string,
    buffer:Buffer,
    contentType:string,
    result:LinksItem
  }){
    if(this.state !== 'initiated'){
      throw new FileArchiveError(`archiveに失敗しました。${this.state}がinitiatedではありません`);
    }
    const {requestURL, buffer, contentType, result} = args;
    if(!setting.isAllowedArchiveURL(requestURL)){
      result.archiveIndex = null;
     return null;
    }
    const prevState = this.recordOfStartedArchiveURL.get(requestURL);
    if(prevState !== undefined){
      result.archiveIndex = prevState.index;
      return null;
    }
    const targetPath = path.join(this.storeDirectory, this.counter.toString());
    result.archiveIndex = this.counter;
    this.recordOfStartedArchiveURL.set(requestURL, {index:this.counter, contentType:contentType});
    this.counter++;
    const fileHandle = await fs.open(targetPath, 'ax');
    await fileHandle.write(buffer);
    await fileHandle.close();
    return null;
  }
}

export { FileArchive };