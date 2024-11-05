import type { ScenerioOption, ValidURL } from "@/component/snapshot/ScenarioFormData";
import type { Page, BrowserContext } from "playwright";
import { Note } from "./Note";
import { getURLInPage } from './sub/getURLInPage';

import { setting } from "@/utility/Setting";

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
      const recordedItem:{
        /** このデータの説明文 */
        description:string,
        /** ページ内で使用されているURL */
        relativeURLs:string[],
      } = {
        description:'ページからのリクエストに対するレスポンスを記録する',
        relativeURLs:[]
      };
      this.pageResult.record['record link in page'] = recordedItem;
      page.on('request',(request)=>{
        this.URLWaitingForFinish.add(request.url());
      })
      page.on('response', (response)=>{
        const statusType = Math.floor(response.status() / 100);
        if(statusType !== 3){
          // サーバーリダイレクト以外の場合は記録する
          (async ()=>{
            await this.pageResult.updateLinks(response.request());
          })();
          recordedItem.relativeURLs.push(response.url());
        }
      });
      page.on('requestfailed',(request)=>{
        (async ()=>{
          await this.pageResult.updateLinks(request);
        })();
        recordedItem.relativeURLs.push(request.url());
        this.URLWaitingForFinish.delete(request.url());
        // console.log(`request failed ${request.url()}`);
      });
      page.on('requestfinished', (request)=>{
        this.URLWaitingForFinish.delete(request.url());
        (async ()=>{
          //Todo: 取得したファイルを保存する
        })();
      });
    })();

    // Basic認証のアイパスの設定
    const authEncoded = setting.getBasicAuthorization(url);
    if(authEncoded !== null){
      page.setExtraHTTPHeaders({...authEncoded});
    }
    type FirstRequested = {
      url: ValidURL,
      redirect:null
    } | {
      url: ValidURL,
      redirect:{
        count:number|null,
        transition:{url:string,status:number}[],
      },
    };
    try {
      const optionOfPageTransition:Parameters<Page["goto"]>[1] = {
        ...{waitUntil:'networkidle'},
        ...this.option,
      };
      const response = await page.goto(url, optionOfPageTransition);
      if(response === null){
        const firstRequested:FirstRequested = {
          url,
          redirect: null
        }
        this.pageResult.record.firstRequested = firstRequested;
      }else{
        // リダイレクト回数・遷移を取得
        let redirectCount:number = -1;
        const redirectResult:Exclude<FirstRequested["redirect"],null>["transition"] = [];
        let prevRequest:Awaited<ReturnType<(typeof response)["request"]>>|null;
        const MAX_REDIRECT_COUNT = 10;
        prevRequest = response.request();
        while(prevRequest !== null && redirectCount <= MAX_REDIRECT_COUNT){
          const status = (await prevRequest.response())?.status();
          if(status !== undefined){
            redirectResult.push({
              url: prevRequest.url(),
              status: status,
            });
          }
          prevRequest = prevRequest.redirectedFrom();
          redirectCount++;
        };
        const firstRequested:FirstRequested = {
          url,
          redirect:{
            count: redirectCount <= MAX_REDIRECT_COUNT ? redirectCount : null,
            transition: redirectResult,
          }
        };
        this.pageResult.record.firstRequested = firstRequested;
      }
    }catch(e){
      console.error(e);
    }
    // afterLoaded ページ読み込み完了後
    await (async ()=>{
      const recordedItem:{
        /** このデータの説明文 */
        description:string,
        /** ページ内に記述されているURL。相対・ルート相対・#始まりなどもあり */
        relativeURLs:ReturnType<typeof getURLInPage>,
      } = {
        description:'ページからリンクを抽出する',
        relativeURLs:[]
      };
      this.pageResult.record['extractor link'] = recordedItem;
      const dataFromHeadlessBrowser = await page.evaluate(getURLInPage);
      recordedItem.relativeURLs = dataFromHeadlessBrowser;
    })();
    await page.close({reason:'全てのシナリオが終了したため、ページをクローズ'});
    return {
      url
    };
  }
}

export { Scenario }