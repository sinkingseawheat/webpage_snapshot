
import fs from 'fs/promises';
import path from 'path';
import type { Note } from './Note';
import { setting } from '@/utility/Setting';

class FileArchiveError extends Error {
  static {
    this.prototype.name = 'FileArchiveError';
  }
}

class FileArchive{
  private storeDirectory:string;
  private counter:number = 1;
  private listOfFile:Map<string, {index:number, contentType:string}> = new Map();
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
    buffer:Buffer,
    contentType:string,
  }){
    if(this.state !== 'initiated'){
      throw new FileArchiveError(`archiveに失敗しました。${this.state}がinitiatedではありません`);
    }
    const {requestURL, buffer, contentType} = args;
    const linksItem = this.links.get(requestURL);
    if(linksItem===undefined){
      console.error(`${requestURL}はlinksに含まれていません`)
      return null;
    }
    const conditionOfCanArchive = setting.getallowArchive(requestURL);
    // 既にファイルのアーカイブとそのハッシュ値の取得が開始している。またはアーカイブの許可設定がない、アーカイブが不許可のURLの場合はスキップ
    if(
      this.listOfFile.get(requestURL) !== undefined
      || conditionOfCanArchive.length === 0
      || !conditionOfCanArchive.some((regExp) => regExp.test(requestURL))
    ){
      return null;
    }
    const targetPath = path.join(this.storeDirectory, this.counter.toString());
    this.listOfFile.set(requestURL, {index:this.counter, contentType:contentType});
    this.counter++;
    const fileHandle = await fs.open(targetPath, 'ax');
    await fileHandle.write(buffer);
    await fileHandle.close();
    return null;
  }
  async finish():Promise<void>{
    if(this.state !== 'initiated'){
      throw new Error(`closeに失敗しました。${this.state}がinitiatedではありません`)
    }
    const targetPath = path.join(this.storeDirectory, '__list.json');
    const fileHandle = await fs.open(targetPath, 'ax');
    const serializableList:{[k:string]:{index:number,contentType:string}} = {};
    for( const [requestURL, obj] of this.listOfFile ){
      serializableList[requestURL] = obj;
    }
    await fileHandle.write(JSON.stringify(serializableList, null, '\t'));
    await fileHandle.close();
    this.state = 'closed';
  }
}

export { FileArchive };