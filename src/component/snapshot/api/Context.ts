import { chromium } from 'playwright';
import type { BrowserContextOptions, Browser, BrowserContext } from 'playwright';
import PQueue from 'p-queue';
import path from 'path';

import { defaultFormFieldValues ,deserializeScenerioFormFields, deserializeBrowserContextPickedFormFields } from '@/component/snapshot/FormData';
import { ValidURL } from '@/utility/types/types';
import { Scenario } from '@/component/snapshot/api/Scenario';

import { setting } from '@/utility/Setting';
import { entrance } from './entrance';
import { MainResult } from './MainResutl';

class ContextError extends Error {
  static {
    this.prototype.name = 'ContextError';
  }
}

class Context {
  private scenarioQueue:PQueue;
  private mainResult:MainResult;
  private scenarios:Scenario[] = [];
  private iscaughtError:boolean = false;
  private browser:Browser|null;
  private browserContext:BrowserContext|null;
  private occupiedDirectoryPath:string;
  constructor(
    private formData:typeof defaultFormFieldValues,
    private jobId:string,
  ){
    const [ymd, hash] = this.jobId.split('-');
    this.occupiedDirectoryPath = path.join(process.cwd(), `./_data/result`, `snapshot/${ymd}/${hash}`);
    this.browser = null;
    this.browserContext = null;
    this.scenarioQueue = new PQueue({concurrency:3,throwOnTimeout:true});
    const {urlsToOpen, ...formDataExcluded} = this.formData
    this.mainResult = new MainResult(formDataExcluded, this.occupiedDirectoryPath);
    // 新しいリクエストが来る際にsettingは読み込みなおす
    setting.update();
  }
  async init(){
    if(this.browser === null){
      this.browser = await chromium.launch({headless:false});
    }
    const _browserContextOption = deserializeBrowserContextPickedFormFields(this.formData);
    const browserContextOption = (()=>{
      const _proxy = setting.getProxy();
      if(_proxy === null){
        return _browserContextOption;
      }else{
        return {
          ...{
            proxy: _proxy,
          },
          ..._browserContextOption
        };
      }
    })();
    this.browserContext = await this.browser.newContext(browserContextOption);
    if(this.browserContext === null){
      throw new ContextError(`browser.newContextに失敗しました`);
    }
    const browserContext = this.browserContext; // ナローイングがうまくいかないので改めて変数に代入
    const scenarioOption = deserializeScenerioFormFields(this.formData);
    const {urlsToOpen, ...otherScenarioOption} = scenarioOption;
    const registerdValidURLs:ValidURL[] = urlsToOpen.map((targetURL)=>{
      const indexOfURL = this.mainResult.addTargetURL(targetURL);
      if(indexOfURL!==null){
        // pageResultではなく、Scenarioを使う
        this.scenarios.push(new Scenario(
          targetURL,
          indexOfURL,
          browserContext,
          this.mainResult,
          otherScenarioOption,
          this.occupiedDirectoryPath
        ));
        return targetURL;
      }
      return null;
    }).filter((_targetURL)=>_targetURL!==null);
    return {
      validURLs: registerdValidURLs,
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
    this.scenarioQueue.on('idle', async ()=>{
      await (async ()=>{
        if(this.iscaughtError){
          this.browserContext?.pages().forEach(async (page)=>{
            await page.close();
          })
        }
        entrance.check(true);
        if(this.browserContext !== null){
          await this.mainResult.requestRemainedURL({
            browserContext:this.browserContext,
            handleFinishRequestRemainedURL:(async ()=>{
              await this.mainResult.dumpJSON();
              if(this.browserContext !== null){
                this.browserContext.close().finally(()=>{
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
            }),
          });
        }
      })();
    });
    this.scenarios.forEach((scenario)=>{
      this.scenarioQueue.add(async ()=>{
        try{
          const {targetURL, responseErrorMessage} = await scenario.start();
          if(responseErrorMessage === 'ERR_INVALID_AUTH_CREDENTIALS'){
            // TargetURLでのリクエストは、Basic認証に失敗した場合は全て強制終了させる
            console.error(`${targetURL}の処理を中止しました。Basic認証が誤っていると思われます。サーバーへの負荷を避けるため全てのリクエストを中止します。`);
            this.scenarioQueue.clear();
            this.iscaughtError = true;
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
}

export { Context }