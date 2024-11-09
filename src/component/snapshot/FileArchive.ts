
import fs from 'fs/promises';
import path from 'path';
import type { Note } from './Note';

class FileArchiveError extends Error {
  static {
    this.prototype.name = 'FileArchiveError';
  }
}

class FileArchive{
  private storeDirectory:string;
  private counter:number = 1;
  private listOfFile:Map<string, number> = new Map();
  private state:'created'|'initiated'|'closed' = 'created';
  constructor(
    occupiedDirectoryPath:string,
    private links:Note["mainResult"]["links"],
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
    buffer:Buffer
  }){
    if(this.state !== 'initiated'){
      throw new FileArchiveError(`archiveに失敗しました。${this.state}がinitiatedではありません`);
    }
    const {requestURL, buffer} = args;
    const linksItem = this.links.get(requestURL);
    if(linksItem===undefined){
      console.error(`${requestURL}はlinksに含まれていません`)
      return null;
    }
    // 既にファイルのアーカイブとそのハッシュ値の取得が開始していたらスキップ
    if(this.listOfFile.get(requestURL)!==undefined){
      return null;
    }
    const targetPath = path.join(this.storeDirectory, this.counter.toString());
    this.listOfFile.set(requestURL, this.counter);
    this.counter++;
    const fileHandle = await fs.open(targetPath, 'ax');
    await fileHandle.write(buffer);
    await fileHandle.close();
    return null;
  }
  async close():Promise<void>{
    if(this.state !== 'initiated'){
      throw new Error(`closeに失敗しました。${this.state}がinitiatedではありません`)
    }
    const targetPath = path.join(this.storeDirectory, '__list.json');
    const fileHandle = await fs.open(targetPath, 'ax');
    const serializableList:{[k:string]:number} = {};
    for( const [requestURL,index] of this.listOfFile ){
      serializableList[requestURL] = index;
    }
    await fileHandle.write(JSON.stringify(serializableList, null, '\t'));
    await fileHandle.close();
    this.state = 'closed';
  }
}

export { FileArchive };