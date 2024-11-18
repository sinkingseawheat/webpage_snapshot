import type { Page, Response, Frame } from "playwright";
import { setting } from "@/utility/Setting";

export const getResponseByPageGoto = async (
  page:Page,
  requestURL:string,
  option?:Parameters<Page["goto"]>[1]
)=>{
  let errorMessage: '' | '[unplanned]' | '[no resopnse]' | '[too many redirects]' | 'net:ERR_FAILED' | 'ERR_INVALID_AUTH_CREDENTIALS' = '';
  try {
    // Basic認証のアイパスの設定
    const authEncoded = setting.getBasicAuthorization(requestURL);
    if(authEncoded !== null){
      page.setExtraHTTPHeaders({...authEncoded});
    }
    const redirectCountCheck = new Map<Frame, Map<string, number>>();
    page.on('framenavigated', (frame)=>{
      const targetFrame = redirectCountCheck.get(frame);
      if(targetFrame === undefined){
        redirectCountCheck.set(frame, new Map<string, number>());
      }else{
        const targetURLCount = targetFrame.get(frame.url());
        if(targetURLCount === undefined){
          targetFrame.set(frame.url(),1);
        }else{
          if(targetURLCount > 2){
            page.close().then(()=>{
              console.log(`${page.url()} is closed`);
              // ここでthrowをするとunhandled Errorが発生するので、標準の「Target page, context or browser has been closed」でエラーを補足する
            });
          }else{
            targetFrame.set(frame.url(), targetURLCount+1);
          }
        }
      }
    });
    const response = await page.goto(requestURL, {
      ...{
        timeout: 5_000,
        waitUntil: 'networkidle',
      },
      ...option
    });
    errorMessage = response === null ? '[no resopnse]' : '';
    return {
      response,
      errorMessage,
    };
  }catch(e){
    if(e instanceof Error && e.message.indexOf('Target page, context or browser has been closed')!==-1){
      errorMessage = '[too many redirects]';
    }else if(e instanceof Error && e.message.indexOf('net::ERR_FAILED')!==-1){
      errorMessage = 'net:ERR_FAILED';
    }else if(e instanceof Error && e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
      // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
      errorMessage = 'ERR_INVALID_AUTH_CREDENTIALS';
    }else{
      console.error('getResponseByPageGoto内で未定義のエラーです。');
      console.error(e);
      errorMessage = '[unplanned]';
    }
    return {
      response: null,
      errorMessage,
    };
  }
}
