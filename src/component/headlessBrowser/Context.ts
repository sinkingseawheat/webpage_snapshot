import { chromium } from 'playwright';
import type { BrowserContextOptions, Browser, BrowserContext } from 'playwright';
import PQueue from 'p-queue';

import { deserializeBrowserContextPickedFormFields } from '@/component/headlessBrowser/FormData';
import { deserializeScenerioFormFields } from '@/component/snapshot/ScenarioFormData';
import type { BrowserContextPickedFormFields  } from '@/component/headlessBrowser/FormData';
import type { ScenarioFormFields, ScenerioOption, ValidURL } from '@/component/snapshot/ScenarioFormData';

import { Note } from '@/component/snapshot/Note';
import { Scenario } from '@/component/snapshot/Scenario';

import { setting } from '@/utility/Setting';
import { entrance } from './entrance';

class ContextError extends Error {
  static {
    this.prototype.name = 'ContextError';
  }
}

class Context {
  private bcoption: BrowserContextOptions;
  private soption: ScenerioOption;
  private queue:PQueue;
  private context: BrowserContext|null = null;
  private note!:Note;
  private scenarios:Scenario[] = [];
  private id:string;
  private iscaughtError:boolean = false;
  private browser!:Browser|null;
  constructor(
    formData:ScenarioFormFields & BrowserContextPickedFormFields,
    apiType:string,
    contextId:string,
  ){
    const {urlsToOpen ,...optionsToNote} = formData;
    this.browser = null;
    this.bcoption = deserializeBrowserContextPickedFormFields(formData);
    this.soption = deserializeScenerioFormFields(formData);
    this.id = contextId;
    this.note = new Note(
      optionsToNote,
      this.soption.urlsToOpen,
      {
        apiType: apiType,
        contextId: contextId,
      },
    );
    this.queue = new PQueue({concurrency:3,throwOnTimeout:true});
    // 新しいリクエストが来る際にproxyとbasic認証は読み込みなおす
    setting.update();
  }
  async init(){
    try{
      await this.note.init();
    }catch(e){
      console.error(e);
      throw new ContextError(`記録用JSONファイルを格納するディレクトリの作成に失敗しました`);
    }
    const contextOption = (()=>{
      const _proxy = setting.getProxy();
      if(_proxy === null){
        return this.bcoption;
      }else{
        return {
          ...{
            proxy: _proxy,
          },
          ...this.bcoption
        };
      }
    })();
    if(this.browser === null){
      this.browser = await chromium.launch({headless:true});
    }
    this.context = await this.browser.newContext(contextOption);
    const {urlsToOpen, ...otherOption} = this.soption;
    urlsToOpen.forEach((url)=>{
      if(this.context !== null){
        this.scenarios.push(new Scenario(this.note.createPageResult(url), this.context, otherOption));
      }
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
    this.queue.on('idle', async ()=>{
      await (async ()=>{
        if(this.iscaughtError){
          this.onAllScenarioEnd(`続行不可能なエラーが発生しました`);
          this.context?.pages().forEach(async (page)=>{
            await page.close();
          })
        }
        entrance.check(true);
        await this.note.archiveNotRequestURL(this.context, this.onAllScenarioEnd.bind(this));
      })();
    });
    this.scenarios.forEach((scenario)=>{
      this.queue.add(async ()=>{
        try{
          return await scenario.start();
        }catch(e){
          console.error(e);
          this.queue.clear();
          this.iscaughtError = true;
        }
      });
    });
    return {
      isStarted:true,
    }
  }

  onAllScenarioEnd(errorMessage?:string):void{
    if(errorMessage){
      console.error(errorMessage);
    }
    if(this.context !== null){
      this.context.close().finally(()=>{
        console.log(`-- ${this.id}の処理を完了しました --`);
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