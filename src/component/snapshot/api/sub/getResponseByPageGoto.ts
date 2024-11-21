import type { Page, Frame, Response } from "playwright";
import { setting } from "@/utility/Setting";
import { ErrorMessage } from "@/utility/types/types";

export const getResponseByPageGoto = async (
  page:Page,
  requestURL:string,
  option?:Parameters<Page["goto"]>[1]
)=>{
  const rv:{
    response:Response | null,
    errorMessage:ErrorMessage,
  }={
    response:null,
    errorMessage:'',
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
    const response = await page.goto(requestURL, {
      ...{
        waitUntil: 'networkidle',
      },
      ...option
    });
    if(rv.errorMessage === ''){
      rv.errorMessage = (response === null) ? '[no resopnse]' : '';
    }
    rv.response = response;
    return rv;
  }catch(e){
    if(e instanceof Error && e.message.indexOf('net::ERR_FAILED')!==-1){
      rv.errorMessage = 'net::ERR_FAILED';
    }else if(e instanceof Error && e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
      // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
      rv.errorMessage = 'ERR_INVALID_AUTH_CREDENTIALS';
    }else if(e instanceof Error && e.name === 'TimeoutError'){
      rv.errorMessage = '[TimeoutError]';
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
    return rv;
  }
}
