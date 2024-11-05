import path from 'path';

import type { BrowserContextOptions, Browser } from 'playwright';
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
  private note!:Note;
  private scenarios:Scenario[] = [];
  private id:string;
  constructor(args:{
    formData:ScenarioFormFields & BrowserContextPickedFormFields,
    apiType:string,
    contextId:string,
  }){
    const {formData, apiType, contextId} = args;
    this.bcoption = deserializeBrowserContextPickedFormFields(formData);
    this.soption = deserializeScenerioFormFields(formData);
    this.id = contextId;
    this.note = new Note(
      this.bcoption,
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
  async init(browser: Browser){
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
    const context = await browser.newContext(contextOption);
    const {urlsToOpen, ...otherOption} = this.soption;
    urlsToOpen.forEach((url)=>{
      this.scenarios.push(new Scenario(this.note.createPageResult(url), context, otherOption));
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
    this.queue.on('completed',(result)=>{
      console.log(result);
      console.log('-- completed --');
    });
    this.queue.on('error',(error)=>{
      console.error(error);
    });
    this.queue.on('idle',async ()=>{
      await (async ()=>{
        console.log(`${this.id}のリクエストを完了しました`);
        entrance.check(true);
        await this.note.write();
        console.log(`${this.id}の処理結果を保存しました`);
      })();
    });
    this.scenarios.forEach((scenario)=>{
      this.queue.add(async ()=>{
        try{
          return await scenario.start();
        }catch(e){
          console.error(e);
        }
      });
    });
    return {
      isStarted:true,
    }
  }
}

export { Context }