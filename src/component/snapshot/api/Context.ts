import { chromium } from 'playwright';
import type { BrowserContextOptions, Browser, BrowserContext } from 'playwright';
import PQueue from 'p-queue';

import { defaultFormFieldValues ,deserializeScenerioFormFields, deserializeBrowserContextPickedFormFields } from '@/component/snapshot/FormData';
import { ValidURL } from '@/utility/types/types';

import { Note } from '@/component/snapshot/api/Note';
import { Scenario } from '@/component/snapshot/api/Scenario';

import { setting } from '@/utility/Setting';
import { entrance } from './entrance';

class ContextError extends Error {
  static {
    this.prototype.name = 'ContextError';
  }
}

class Context {
  private browserContextOption: ReturnType<typeof deserializeBrowserContextPickedFormFields>
  private scenarioQueue:PQueue;
  private note!:Note;
  private scenarios:Scenario[] = [];
  private iscaughtError:boolean = false;
  private browser!:Browser|null;
  constructor(
    private formData:typeof defaultFormFieldValues,
    private apiType:string,
    private jobId:string,
  ){
    this.browser = null;
    this.scenarioQueue = new PQueue({concurrency:3,throwOnTimeout:true});
    // 新しいリクエストが来る際にsettingは読み込みなおす
    setting.update();
  }
  async init(){
    // Todo:entrance側でimportの失敗をcatchする
    const Scenario = await import(`../${this.apiType}/api/Scenario`);
    this.scenarios.push(new Scenario(this.formData, this.browser));
    if(this.browser === null){
      this.browser = await chromium.launch({headless:true});
    }
    const context = await this.browser.newContext(contextOption);
    if(context !== null){
      const getPromiseItem = async (url:ValidURL)=>{
        const page = await context.newPage();
      }
      const promises:Promise<void>[] = []
      for (const url of urlsToOpen){
        promises.push(getPromiseItem(url));
      }
      await Promise.all(promises);
    }
    this.scenarioQueue.on('idle', async ()=>{
      await (async ()=>{
        if(this.iscaughtError){
          context.pages().forEach(async (page)=>{
            await page.close();
          })
        }
        entrance.check(true);
        await this.note.archiveNotRequestURL(context, this.onAllScenarioEnd.bind(this, context));
      })();
    });
    return {
      validURLs:urlsToOpen,
    };
  }

  start():{
    isStarted:boolean,
    message?:string,
  }{
    if(this.scenarios.length === 0){
      return {
        isStarted:false,
        message:'URLが登録されていません。await init()を実行してください'
      }
    }
    this.scenarios.forEach((scenario)=>{
      this.scenarioQueue.add(async ()=>{
        try{
          const {indexOfURL, pageResultRecord, responseErrorMessage} = await scenario.start();
          if(responseErrorMessage === 'ERR_INVALID_AUTH_CREDENTIALS'){
            // Basic認証に失敗したtargetURLがあったら、全て終了させる
            console.error(`${scenario.requestURL}の処理を中止しました。Basic認証が誤っていると思われます。サーバーへの負荷を避けるため全てのリクエストを中止します。`);
            this.scenarioQueue.clear();
            this.iscaughtError = true;
          }else{
            await this.note.writePageResult({indexOfURL, pageResultRecord});
          }
        }catch(e){
          console.error(e);
        }
      });
    });
    return {
      isStarted:true,
    }
  }

  onAllScenarioEnd(context:BrowserContext):void{
    if(context !== null){
      context.close().finally(()=>{
        console.log(`-- ${this.jobId}の処理を完了しました --`);
        // broser.contextが0の状態で起動したまま、Context["request"]を繰り返すとChromeのスレッドが増殖していくのでちゃんと閉じる
        if(this.browser !== null && this.browser.contexts().length === 0){
          this.browser.close().finally(()=>{
            this.browser = null;
            console.log('フォームからのリクエストがすべて終了したため、browserが終了しました');
          });
        }
      });
    }
  }
}

export { Context }