import type { Page, Frame, Response } from "playwright";
import { setting } from "@/utility/Setting";
import { ErrorMessage } from "@/utility/types/types";
import { type PageResultRecord } from "../../JSON";

export const getResponseByPageGoto = async (
  page:Page,
  requestURL:string,
  option?:Parameters<Page["goto"]>[1]
)=>{
  const rv:{
    response:Response | null,
    errorMessage:ErrorMessage,
    redirectInBrowser:string[],
  }={
    response:null,
    errorMessage:'',
    redirectInBrowser:[],
  }
  try {
    // Basic認証のアイパスの設定
    const authEncoded = setting.getBasicAuthorization(requestURL);
    if(authEncoded !== null){
      page.setExtraHTTPHeaders({...authEncoded});
    }
    const redirectCountCheck = new Map<Frame, Map<string, number>>();
    let isSetRouter = false;
    page.on('framenavigated', (frame)=>{
      if(frame === page.mainFrame()){
        rv.redirectInBrowser.push(frame.url());
      }
      // metaやjavascriptによる無限リダイレクトの抑止
      const targetFrame = redirectCountCheck.get(frame);
      if(targetFrame === undefined){
        redirectCountCheck.set(frame, new Map<string, number>());
      }else{
        const targetURLCount = targetFrame.get(frame.url());
        if(targetURLCount === undefined){
          targetFrame.set(frame.url(),1);
        }else{
          if(targetURLCount > 2){
            if(isSetRouter===false){
              rv.errorMessage = '[too many redirects]';
              page.route('**/*',(router)=>{
                router.abort();
              }).then(()=>{
                console.log(`${requestURL} is redirect loop. Stopped request`)
              });
            }
            isSetRouter = true;
          }
          targetFrame.set(frame.url(), targetURLCount+1);
        }
      }
    });
    const gotoOption = {
      ...{
        waitUntil: 'networkidle' as const,
      },
      ...option
    };
    const response = await page.goto(requestURL, gotoOption);
    // meta refreshリダイレクトで秒数が指定されている場合は、無理やり遷移させる。
    let urlGottenFromMetaRefresh = null;
    do{
      const metaContent = await page.evaluate(()=>{
        const metaElm = document.querySelector('meta[http-equiv="refresh"]');
        if(metaElm!==null){
          return metaElm.getAttribute('content');
        }else{
          return null;
        }
      });
      const urlGottenFromMetaRefresh = metaContent?.match(/url=(.+)/)?.[1];
      if(typeof urlGottenFromMetaRefresh === 'string' && URL.canParse(urlGottenFromMetaRefresh, requestURL)){
        const href = new URL(urlGottenFromMetaRefresh, requestURL).href;
        await page.goto(href, gotoOption);
      }
    }while(urlGottenFromMetaRefresh !== null)
    if(rv.errorMessage === ''){
      rv.errorMessage = (response === null) ? '[no resopnse]' : '';
    }
    rv.response = response;
  }catch(e){
    if(e instanceof Error && e.message.indexOf('net::ERR_FAILED')!==-1){
      rv.errorMessage = 'net::ERR_FAILED';
    }else if(e instanceof Error && e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
      // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
      rv.errorMessage = 'ERR_INVALID_AUTH_CREDENTIALS';
    }else if(e instanceof Error && e.name === 'TimeoutError'){
      rv.errorMessage = '[TimeoutError]';
    }else if(e instanceof Error && e.message.indexOf('Cannot navigate to invalid URL') !== -1){
      console.error(e);
      rv.errorMessage = '[no resopnse]';
    }else if(e instanceof Error){
      console.error('---')
      console.error(e)
      console.error(`${e.name}----${e.message}`);
      rv.errorMessage = '[unplanned]';
    }else{
      console.error('getResponseByPageGoto内で未定義のエラーです。');
      console.error(e);
      rv.errorMessage = '[unplanned]';
    }
    rv.response = null;
  }finally{
    return rv;
  }
}
