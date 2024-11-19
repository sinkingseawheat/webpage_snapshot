import { isValidURL, ValueOfMap, type ValidURL } from "@/utility/types/types";
import type { Browser, Page, Request } from "playwright";

import { deserializeScenerioFormFields, defaultFormFieldValues, deserializeBrowserContextPickedFormFields } from "@/component/snapshot/FormData";

import { setting } from "@/utility/Setting";
import { getRedirectStatusFromRequest } from "./sub/getRedirectStatusFromRequest";

import { getCapture } from "./scenario/getCapture";
import { getExtractLinks } from "./scenario/getExtractLinks";
import { getResponseByPageGoto } from "./sub/getResponseByPageGoto";
import { MainResultRecord, PageResultRecord } from "../JSON";
import { PageResult } from "./PageResult";
import { MainResult } from "./MainResutl";

type FormData = typeof defaultFormFieldValues;

class ScenarioError extends Error {
  static {
    this.prototype.name = 'ScenarioError';
  }
}

class Scenario {
  private responseResult!:Awaited<ReturnType<typeof getResponseByPageGoto>>;
  public requestURL:ValidURL;
  private mainResult: MainResult;
  private pageResults: PageResult[];
  constructor(
    formData:FormData,
    browser:Browser
  ){
    this.mainResult = new MainResult();
    const _browserContextOption = deserializeBrowserContextPickedFormFields(formData);
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
    const {urlsToOpen, ...scenarioOption} = deserializeScenerioFormFields(formData);
    this.requestURL = this.pageResult.getURL();
    this.pageResult = new PageResult(requestURL, )
  }
  async start(){
    const url = this.requestURL;

    // PageResultに移動
    console.log(`-------`);
    console.log(`次のページ単体の処理を開始しました: ${url}`);
    let redirectTransition:PageResultRecord["redirectTransition"] = [];
    const URLsRequestedFromPage:PageResultRecord["URLsRequestedFromPage"] = [];
    let DOMtext:PageResultRecord["DOMtext"] = '';
    let URLsExtracted:PageResultRecord["URLsExtracted"] = [];
    let pageCapture:PageResultRecord["pageCapture"] = [];
    let storedRequestMap:Map<string,{request:Request, errorMessage:ValueOfMap<MainResultRecord["links"]>["errorMessage"]}> = new Map();
    // beforeGoto ページ読み込み前
    (()=>{
      this.page.on('requestfailed',(request)=>{
        (async ()=>{
          const response = await request.response();
          if(response !== null){
            const statusType = Math.floor(response.status() / 100);
            if(statusType !== 3){
              // サーバーリダイレクト以外の場合は記録する
              const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
              storedRequestMap.set(requestURLFromPage, {request, errorMessage:'[on requestfailed]'});
            }
          }else{
            const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
            storedRequestMap.set(requestURLFromPage, {request, errorMessage:'[no resopnse]'});
          }
        })();
      });
      this.page.on('requestfinished', (request)=>{
        (async ()=>{
          const response = await request.response();
          if(response !== null){
            const statusType = Math.floor(response.status() / 100);
            if(statusType !== 3){
              // サーバーリダイレクト以外の場合は記録する
              const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
              storedRequestMap.set(requestURLFromPage, {request, errorMessage:''});
            }
          }else{
            const requestURLFromPage = await getRedirectStatusFromRequest(request, false);
            storedRequestMap.set(requestURLFromPage, {request, errorMessage:'[no resopnse]'});
          }
        })();
      });
    })();
    try {
      const {referer} = this.option;
      const gotoOption = (referer === undefined || referer === '') ? undefined : {referer}
      this.responseResult = await getResponseByPageGoto(this.page, url, gotoOption);
      const {response, errorMessage} = this.responseResult;
      // page.on('requestfailed'),page.on('requestfinished')のリスナーによるデータ収集はここで終える。
      redirectTransition = response === null ? [] : await getRedirectStatusFromRequest(response.request(), true);
      // MainResultRecord["links"]の更新を行う。
      const promises = [];
      for(const [requestURLFromPage, result] of storedRequestMap){
        if(isValidURL(requestURLFromPage)){
          URLsRequestedFromPage.push(requestURLFromPage);
        }
        // result.errorMessageはrequestURLFromPageではなく、taregetURLに含まれるurlのエラーメッセージ
        promises.push(this.pageResult.updateLinksFromRequestedURL(requestURLFromPage, result.request, result.errorMessage))
      }
      await Promise.all(promises);
      if(response !== null && errorMessage === ''){
        // afterLoaded ページ読み込み完了後
        await (async ()=>{

          // ページのDOM構造を取得
          if(setting.isAllowedArchiveURL(url)){
            DOMtext = await this.page.content();
          }else{
            DOMtext = null;
          }

          // リンク要素の抽出
          URLsExtracted = await getExtractLinks(this.page);

          for(const extractedLink of URLsExtracted || []){
            for(const absURL of extractedLink["absURLs"]){
              if(absURL !== null){
                this.pageResult.updateLinksFromExtractedURL(absURL);
              }
            }
          }

          // キャプチャ取得
          pageCapture = await getCapture(this.page);
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
        pageResultRecord: {
          redirectTransition,
          URLsRequestedFromPage,
          DOMtext,
          URLsExtracted,
          pageCapture,
        },
        responseErrorMessage: this.responseResult.errorMessage,
      };
    }
  }
}

export { Scenario }