import type { ScenerioOption, ValidURL } from "@/component/snapshot/ScenarioFormData";
import type { Page, BrowserContext } from "playwright";
import { Note } from "./Note";
import { getURLInPage } from './sub/getURLInPage';

import { setting } from "@/utility/Setting";
import { isValidURL } from "@/utility/Types";
import { getRedirectStatusFromRequest } from "./sub/getRedirectStatusFromRequest";

class Scenario {
  public URLWaitingForFinish:Set<string> = new Set();
  constructor(
    private pageResult: ReturnType<Note["createPageResult"]>,
    private context: BrowserContext,
    private option: Omit<ScenerioOption, "urlsToOpen">,
  ){
  }
  async start():Promise<{
    url:string,
  }>{
    const url = this.pageResult.getURL();
    const page = await this.context.newPage();
    // beforeGoto ページ読み込み前
    (()=>{
      const recordedItem:typeof this.pageResult["record"]["URLRequestedFromPage"] = {
        requestedURLs:[]
      };
      this.pageResult.record['URLRequestedFromPage'] = recordedItem;
      page.on('request',(request)=>{
        this.URLWaitingForFinish.add(request.url());
      })
      page.on('response', (response)=>{
        const statusType = Math.floor(response.status() / 100);
        if(statusType !== 3){
          // サーバーリダイレクト以外の場合は記録する
          (async ()=>{
            await this.pageResult.updateLinksFromRequestedURL(response.request());
          })();
          recordedItem?.requestedURLs.push(response.url());
        }
      });
      page.on('requestfailed',(request)=>{
        (async ()=>{
          await this.pageResult.updateLinksFromRequestedURL(request);
        })();
        recordedItem?.requestedURLs.push(request.url());
        this.URLWaitingForFinish.delete(request.url());
        // console.log(`request failed ${request.url()}`);
      });
      page.on('requestfinished', (request)=>{
        this.URLWaitingForFinish.delete(request.url());
      });
    })();

    // Basic認証のアイパスの設定
    const authEncoded = setting.getBasicAuthorization(url);
    if(authEncoded !== null){
      page.setExtraHTTPHeaders({...authEncoded});
    }
    try {
      const optionOfPageTransition:Parameters<Page["goto"]>[1] = {
        ...{waitUntil:'networkidle'},
        ...this.option,
      };
      const response = await page.goto(url, optionOfPageTransition);
      const redirect = response === null ? null : await getRedirectStatusFromRequest(response.request(), true);
      const firstRequested:typeof this.pageResult["record"]["firstRequested"] = {
        url,
        redirect
      }
      this.pageResult.record.firstRequested = firstRequested;
    }catch(e){
      console.error(e);
    }
    // afterLoaded ページ読み込み完了後
    await (async ()=>{
      const recordedItem:typeof this.pageResult["record"] = {URLExtracted:[]};
      this.pageResult.record = recordedItem;
      const dataFromHeadlessBrowser = await page.evaluate(getURLInPage);
      for(const elmData of dataFromHeadlessBrowser){
        for(const url of elmData.relURL){
          const absURL = (()=>{
            try{
              const _url = new URL(url, page.url()).href as ValidURL; // isValidURLの処理も含んでいるはずなので、型アサーション
              return _url;
            }catch(e){
              return null;
            }
          })();
          if(absURL !== null){
            this.pageResult.updateLinksFromExtractedURL(absURL);
          }
          elmData.absURL.push(absURL);
        }
      }
      recordedItem["URLExtracted"] = dataFromHeadlessBrowser;
    })();
    await page.close({reason:'全てのシナリオが終了したため、ページをクローズ'});
    return {
      url
    };
  }
}

export { Scenario }