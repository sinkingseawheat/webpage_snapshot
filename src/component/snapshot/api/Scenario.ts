import { ErrorMessage, IndexOfURL, isValidURL, ValueOfMap, type ValidURL } from "@/utility/types/types";
import type { Browser, BrowserContext, Page, Request } from "playwright";

import { setting } from "@/utility/Setting";
import { getRedirectStatusFromRequest } from "./sub/getRedirectStatusFromRequest";
import { deserializeScenerioFormFields } from "../FormData";

import { getCapture } from "./scenario/getCapture";
import { getExtractLinks } from "./scenario/getExtractLinks";
import { getResponseByPageGoto } from "./sub/getResponseByPageGoto";
import { MainResultRecord, PageResultRecord } from "../JSON";
import { PageResult } from "./PageResult";
import { MainResult } from "./MainResutl";

class ScenarioError extends Error {
  static {
    this.prototype.name = 'ScenarioError';
  }
}

class Scenario {
  private responseResultInPage!:Awaited<ReturnType<typeof getResponseByPageGoto>>;
  private pageResult:PageResult;
  constructor(
    private targetURL: ValidURL,
    private indexOfURL: IndexOfURL,
    private context: BrowserContext,
    private mainResult: MainResult,
    private otherScenarioOption: Omit<ReturnType<typeof deserializeScenerioFormFields>,'urlsToOpen'>,
    occupiedDirectoryPath:string,
  ){
    this.pageResult = new PageResult(
      targetURL,
      indexOfURL,
      occupiedDirectoryPath
    );
  }
  async start(){
    // PageResultに移動
    console.log(`-------`);
    console.log(`次のページ単体の処理を開始しました: ${this.indexOfURL} ${this.targetURL}`);
    const page = await this.context.newPage();
    const storedResponsesOfRequestURLFromPage:Map<ValidURL,{request:Request, errorMessage:ValueOfMap<MainResultRecord["links"]>["errorMessage"]}> = new Map();
    // beforeGoto ページ読み込み前
    // ページを読み込み時に発生するネットワークアクセスを記録
    const handleRequestFinished = async (request:Request, isFailed:boolean):Promise<void> => {
      const response = await request.response();
      if(response !== null){
        const statusType = Math.floor(response.status() / 100);
        if(statusType !== 3){
          // サーバーリダイレクト以外の場合は記録する
          const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
          storedResponsesOfRequestURLFromPage.set(requestURLFromPage, {request, errorMessage: isFailed ? '[on requestfailed]' : ''});
        }
      }else{
        const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
        storedResponsesOfRequestURLFromPage.set(requestURLFromPage, {request, errorMessage:'[no resopnse]'});
      }
    }
    page.on('requestfailed',(request)=>{
      (async ()=>{
        await handleRequestFinished(request, true);
      })();
    });
    page.on('requestfinished', (request)=>{
      (async ()=>{
        await handleRequestFinished(request, false);
      })();
    });
    try {
      const {referer} = this.otherScenarioOption;
      const gotoOption = (referer === undefined || referer === '') ? undefined : {referer}
      this.responseResultInPage = await getResponseByPageGoto(page, this.targetURL, gotoOption);
      const {response:pageResponse, errorMessage:pageErrorMessage} = this.responseResultInPage;
      const redirectTransition:PageResultRecord["redirectTransition"] =  pageResponse === null ?
        []
        : [
          {
            url:pageResponse.url(),
            status:pageResponse.status()
          },
          ...await getRedirectStatusFromRequest(pageResponse.request(), true)
        ];
      this.pageResult.updateRecord({redirectTransition});
      // MainResultRecord["links"]の更新を行う。
      // page.on('requestfailed'),page.on('requestfinished')のリスナーによるデータ収集はここで終える。
      const promises = [];
      const URLsRequestedFromPage:PageResultRecord["URLsRequestedFromPage"] = [];
      for(const requestURLFromPage of storedResponsesOfRequestURLFromPage.keys()){
        URLsRequestedFromPage.push(requestURLFromPage);
      }
      for(const [requestURLFromPage, linksItemOfRequestURLFromPage] of storedResponsesOfRequestURLFromPage){
        if(isValidURL(requestURLFromPage)){
          promises.push(this.mainResult.updateLinks({
            targetURL:this.targetURL,
            requestURLFromPage,
            request: linksItemOfRequestURLFromPage.request,
            errorMessage: pageErrorMessage
          }))
        }
      }
      this.pageResult.updateRecord({URLsRequestedFromPage});
      await Promise.all(promises);
      if(pageResponse !== null && pageErrorMessage === ''){
        // afterLoaded ページ読み込み完了後
        await (async ()=>{

          // ページのDOM構造を取得
          if(setting.isAllowedArchiveURL(this.targetURL)){
            this.pageResult.updateRecord({DOMtext: await page.content()});
          }else{
            this.pageResult.updateRecord({DOMtext: null});
          }

          // リンク要素の抽出
          const URLsExtracted = await getExtractLinks(page);
          this.pageResult.updateRecord({URLsExtracted})

          for(const extractedLink of URLsExtracted || []){
            for(const absURL of extractedLink["absURLs"]){
              if(absURL !== null){
                this.mainResult.updateLinks({targetURL:this.targetURL, requestURLFromPage:absURL});
              }
            }
          }

          // キャプチャ取得
          const pageCapture = await getCapture(page);
          this.pageResult.updateRecord({pageCapture});
        })();
      }
    }catch(e){
      console.error('Scenario["start"]内で未定義のエラーです。再スローします');
      throw e;
    }finally{
      if(this.responseResultInPage.errorMessage !== '[too many redirects]'){
        // [too many redirects]の場合はgetResponseByPageGotで既にクローズ処理を行っている
        await page.close({reason:'全てのシナリオが終了したため、ページをクローズ'});
      }
      await this.pageResult.dumpJSON();
      console.log(`次のページ単体の処理を完了しました:${this.targetURL}`);
      return {
        targetURL: this.targetURL,
        responseErrorMessage: this.responseResultInPage.errorMessage,
      };
    }
  }
}

export { Scenario }