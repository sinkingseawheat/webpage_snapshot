import { RandomString } from '@/utility/RandomString';

import type { Browser } from 'playwright';

import type { BrowserContextPickedFormFields, ResponseData } from '@/component/headlessBrowser/FormData';

import { Context } from '@/component/headlessBrowser/Context';

// entranceは各APIで共通化したい。フォームデータの判別はBrowserContextはContextクラスで、ScenarioはScenarioクラスで行うようにしたい。
import type { ScenarioFormFields } from '@/component/snapshot/ScenarioFormData';

class EntranceError extends Error {
  static {
    this.prototype.name = 'EntranceError';
  }
}

type FormData = BrowserContextPickedFormFields & ScenarioFormFields;

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
    const contextId = this.randomString.getUniqueRandomString();
    const context = new Context(formData, apiType, contextId);
    const resultInitiation = await context.init();
    this.contextsPending.set(contextId, context);
    this.check();
    return {
      status: 'OK',
      id: contextId,
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
      const [contextId, context] = value;
      console.log(`-- ${contextId}の処理を開始しました --`);
      const result = context.start();
      this.contextsPending.delete(contextId);
      if(result.isStarted === false){
        console.log(result.message);
        console.log(`${contextId}のリクエストはキャンセルされました`);
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