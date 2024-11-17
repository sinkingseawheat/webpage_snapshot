import type { Page } from "playwright";
import { setting } from "@/utility/Setting";

export const getResponseByPageGoto = async (
  page:Page,
  requestURL:string,
  option?:Parameters<Page["goto"]>[1]
)=>{
  // Basic認証のアイパスの設定
  const authEncoded = setting.getBasicAuthorization(requestURL);
  if(authEncoded !== null){
    page.setExtraHTTPHeaders({...authEncoded});
  }
  let redirectCount = 0;
  page.on('framenavigated', (frame)=>{
    console.log(frame.name())
    console.log(`framenavigated to ${frame.url()} from ${requestURL}`);
    console.log(redirectCount);
    if(redirectCount>=3){
      page.close().finally(()=>{
        throw new Error(`[too many redirects] meta[http-equiv="refresh"]やjavascriptなど、クライアントサイドでの同一URLへの遷移が4回以上起きました。`)
      });
    }
    redirectCount++;
  });
  const response = await page.goto(requestURL, {
    ...{
      timeout: 8_000,
      waitUntil: 'networkidle',
    },
    ...option
  });
  return response;
}
