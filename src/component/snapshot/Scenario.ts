import type { ScenerioOption, ValidURL } from "@/component/snapshot/FormData";
import type { Page, BrowserContext } from "playwright";
import { Note } from "./Note";

import { setting } from "@/utility/Setting";
import { getRedirectStatusFromRequest } from "./sub/getRedirectStatusFromRequest";

import { getCapture } from "./sub_scenario/getCapture";
import { getExtractLinks } from "./sub_scenario/getExtractLinks";
import { getResponseByPageGoto } from "./sub/getResponseByPageGoto";

class ScenarioError extends Error {
  static {
    this.prototype.name = 'ScenarioError';
  }
}

class Scenario {
  public URLWaitingForFinish:Set<string> = new Set();
  private responseResult!:Awaited<ReturnType<typeof getResponseByPageGoto>>;
  public requestURL:ValidURL;
  constructor(
    private pageResult: ReturnType<Note["createPageResult"]>,
    private page: Page,
    private option: Omit<ScenerioOption, "urlsToOpen">,
  ){
    this.requestURL = this.pageResult.getURL();
  }
  async start(){
    const url = this.requestURL;
    console.log(`-------`);
    console.log(`次のページ単体の処理を開始しました: ${url}`);
    // beforeGoto ページ読み込み前
    (()=>{
      const recordedItem:typeof this.pageResult["record"]["URLRequestedFromPage"] = {
        requestedURLs:[]
      };
      this.pageResult.record['URLRequestedFromPage'] = recordedItem;
      this.page.on('request',(request)=>{
        this.URLWaitingForFinish.add(request.url());
      })
      this.page.on('response', (response)=>{
        const statusType = Math.floor(response.status() / 100);
        if(statusType !== 3){
          // サーバーリダイレクト以外の場合は記録する
          (async ()=>{
            await this.pageResult.updateLinksFromRequestedURL(response.request());
          })();
          recordedItem.requestedURLs.push(response.url());
        }
      });
      this.page.on('requestfailed',(request)=>{
        (async ()=>{
          await this.pageResult.updateLinksFromRequestedURL(request);
        })();
        recordedItem.requestedURLs.push(request.url());
        this.URLWaitingForFinish.delete(request.url());
      });
      this.page.on('requestfinished', (request)=>{
        this.URLWaitingForFinish.delete(request.url());
      });
    })();
    try {
      const {referer} = this.option;
      const gotoOption = (referer === undefined || referer === '') ? undefined : {referer}
      this.responseResult = await getResponseByPageGoto(this.page, url, gotoOption);
      const {response, errorMessage} = this.responseResult;
      const redirect =
        response === null ?
          null
          : await getRedirectStatusFromRequest(response.request(), true);
      this.pageResult.record.firstRequested = {
        url,
        redirect
      };
      if(response !== null && errorMessage === ''){
        // afterLoaded ページ読み込み完了後
        await (async ()=>{

          // ページのDOM構造を取得
          if(setting.isAllowedArchiveURL(url)){
            this.pageResult.record["DOM"] = {
              source: await this.page.content(),
            }
          }

          // リンク要素の抽出
          this.pageResult.record["URLExtracted"] = await getExtractLinks(this.page);

          for(const extractedLink of this.pageResult.record["URLExtracted"] || []){
            for(const absURL of extractedLink["absURLs"]){
              if(absURL !== null){
                this.pageResult.updateLinksFromExtractedURL(absURL);
              }
            }
          }

          // キャプチャ取得
          this.pageResult.record["PageCapture"] = await getCapture(this.page);
        })();
      }
    }catch(e){
      console.error('Scenario["start"]内で未定義のエラーです。再スローします');
      throw e;
    }finally{
      if(this.responseResult.errorMessage !== '[too many redirects]'){
        // [too many redirects]の場合はgetResponseByPageGotで既にクローズ処理を行っている
        await this.page.close({reason:'全てのシナリオが終了したため、ページをクローズ'});
      }
      console.log(`次のページ単体の処理を完了しました:${url}`);
      return {
        indexOfURL: this.pageResult.getIndexOfURL(),
        pageResultRecord: this.pageResult.record,
        responseErrorMessage: this.responseResult.errorMessage,
      };
    }
  }
}

export { Scenario }