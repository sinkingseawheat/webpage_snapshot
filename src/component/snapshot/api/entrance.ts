import { RandomString } from '@/utility/RandomString';

import { type ResponseData, defaultFormFieldValues } from "@/component/snapshot/FormData";

import { Context } from '@/component/snapshot/Context';

class EntranceError extends Error {
  static {
    this.prototype.name = 'EntranceError';
  }
}

type FormData = typeof defaultFormFieldValues;

class Entrance {
  static MAX_CONTEXT_CONCURRENCY = 1;
  private numberOfNowRunningContext = 0;
  private contextsPending:Map<string, Context>;
  private randomString: RandomString;
  constructor(){
    this.contextsPending = new Map();
    this.randomString = new RandomString(16);
  }
  async request(formData: FormData, apiType: string): Promise<ResponseData>{
    // Contextにデータを送信
    const jobId = this.randomString.getUniqueRandomString();
    const context = new Context(formData, apiType, jobId);
    const resultInitiation = await context.init();
    this.contextsPending.set(jobId, context);
    this.check();
    return {
      id: jobId,
      message: 'キューに挿入完了しました',
      ...resultInitiation,
    };
  }
  get(id:string):Context|null {
    const context = this.contextsPending.get(id);
    return context ?? null;
  }
  check(isNeededDecreaseNumberOfRunning:boolean = false){
    if(isNeededDecreaseNumberOfRunning===true){
      this.numberOfNowRunningContext--;
    }
    const entries = this.contextsPending.entries();
    while (this.numberOfNowRunningContext<Entrance.MAX_CONTEXT_CONCURRENCY){
      const {done, value} = entries.next();
      if(value === undefined){
        break;
      }
      const [jobId, context] = value;
      console.log(`-- ${jobId}の処理を開始しました --`);
      const result = context.start();
      this.contextsPending.delete(jobId);
      if(result.isStarted === false){
        console.log(result.message);
        console.log(`${jobId}のリクエストはキャンセルされました`);
        break;
      }
      this.numberOfNowRunningContext++;
    }
  }
  end(){
    // アプリ終了時の処理
  }
}

// ヘッドレスブラウザは二重起動させず、インスタンスのみ露出させる。
const entrance = new Entrance();

export { entrance }