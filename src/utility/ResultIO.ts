import type { Scenario } from "@/component/snapshot/Scenario";
import fs, { FileHandle } from 'fs/promises';
import path from 'path';

class ResultIOError extends Error {
  static {
    this.prototype.name = 'ResultIOError';
  }
}

class ResultIO {
  private fileHandle:FileHandle|null;
  private isClosed:boolean = false;
  constructor(
    private id:string,
    private index:number,
    private apiType:string,
  ){
    this.fileHandle = null;
  }
  async init():Promise<this>{
    const [ymd, hash] = this.id.split('-');
    try{
      const targetDir = path.join(process.cwd(),`./_data/result/${this.apiType}/${ymd}/${hash}`);
      const dir = await fs.mkdir(targetDir,{recursive:true});
      this.fileHandle = await fs.open(`${targetDir}/${this.index.toString().padStart(3,'0')}.json`,'ax');
    }catch(e){
      if((e as any)?.code==='EEXIST'){
        // Todoファイルが既に存在しているときの挙動
      }
      console.error(e);
      throw new ResultIOError(`記録用JSONファイルの作成に失敗しました`);
    }
    return this;
  }
  async writeJSON(memo:Scenario["memo"]){
    if(this.fileHandle === null){
      throw new ResultIOError(`this.fileHandleがnullです。init()で初期化する必要があります`);
    }
    await this.fileHandle.writeFile(JSON.stringify(memo, null, '\t'));
    await this.fileHandle.close();
    // Todo: isClosedの判定はfileHandleから取り出せないか
    this.isClosed = true;
  }
  async getJSON(){}
}

export { ResultIO }