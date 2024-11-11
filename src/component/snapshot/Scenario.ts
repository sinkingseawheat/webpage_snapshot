import type { ScenerioOption, ValidURL } from "@/component/snapshot/ScenarioFormData";
import type { Page, BrowserContext } from "playwright";
import { Note } from "./Note";
import { getURLInPage } from './sub/getURLInPage';

import { setting } from "@/utility/Setting";
import { isValidURL } from "@/utility/Types";
import { getRedirectStatusFromRequest } from "./sub/getRedirectStatusFromRequest";

class ScenarioError extends Error {
  static {
    this.prototype.name = 'ScenarioError';
  }
}

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
    console.log(`-------`);
    console.log(`次のページ単体の処理を開始しました: ${url}`);
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
      const redirect =
        response === null ?
          null
          : await getRedirectStatusFromRequest(response.request(), true);
      this.pageResult.record.firstRequested = {
        url,
        redirect
      };
    }catch(e){
      if(e instanceof Error && e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
        // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
        throw new ScenarioError(`ページの読み込みに失敗しました。\n  ${url}\nに対するBasic認証が正しいか確認してください。`);
      }else{
        throw new ScenarioError(`「${url}」のページの読み込みに失敗しました。原因は不明です`);
      }
    }
    // afterLoaded ページ読み込み完了後
    await (async ()=>{

      // ページのDOM構造を取得
      if(setting.isAllowedArchiveURL(url)){
        this.pageResult.record["DOM"] = {
          source: await page.content(),
        }
      }

      // リンク要素の抽出
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
      this.pageResult.record["URLExtracted"] = dataFromHeadlessBrowser;

      // キャプチャ取得
      // Todo:ヘッドレスブラウザの幅を変更したときのキャプチャも取得できるようにする
      const screenshotBuffer = await page.screenshot({
        fullPage:true,
        animations:'disabled',
        quality: 50, // 高クオリティのキャプチャは不要
        scale: 'css', // 精細なRetinaのキャプチャは不要
        type: 'jpeg',
      });
      this.pageResult.record["PageCapture"] = {
        name: 'fullpage',
        buffer: screenshotBuffer,
      };
    })();
    await page.close({reason:'全てのシナリオが終了したため、ページをクローズ'});
    console.log(`次のページ単体の処理を完了しました:${url}`);
    return {
      url
    };
  }
}

export { Scenario }