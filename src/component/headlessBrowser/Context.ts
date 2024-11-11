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
  private scenarioQueue:PQueue;
  private note!:Note;
  private scenarios:Scenario[] = [];
  private iscaughtError:boolean = false;
  private browser!:Browser|null;
  constructor(
    formData:ScenarioFormFields & BrowserContextPickedFormFields,
    apiType:string,
    private contextId:string,
  ){
    const {urlsToOpen ,...optionsToNote} = formData;
    this.browser = null;
    this.bcoption = deserializeBrowserContextPickedFormFields(formData);
    this.soption = deserializeScenerioFormFields(formData);
    this.note = new Note(
      optionsToNote,
      this.soption.urlsToOpen,
      {
        apiType: apiType,
        contextId: contextId,
      },
    );
    this.scenarioQueue = new PQueue({concurrency:3,throwOnTimeout:true});
    // 新しいリクエストが来る際にsettingは読み込みなおす
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
    const context = await this.browser.newContext(contextOption);
    const {urlsToOpen, ...otherOption} = this.soption;
    if(context !== null){
      for await (const url of urlsToOpen){
        const page = await context.newPage();
        this.scenarios.push(new Scenario(this.note.createPageResult(url), page, otherOption));
      }
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
          const result = await scenario.start();
          await this.note.writePageResult(result);
        }catch(e){
          console.error(e);
          this.scenarioQueue.clear();
          this.iscaughtError = true;
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
        console.log(`-- ${this.contextId}の処理を完了しました --`);
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