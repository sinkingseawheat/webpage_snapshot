import { type ValidURL } from "@/utility/types/types";
import type { Page } from "playwright";
import { getURLInPage } from "../sub/getURLInPage";

export const getExtractLinks = async (page:Page, )=>{
  const dataFromHeadlessBrowser = await page.evaluate(getURLInPage);
  for(const elmData of dataFromHeadlessBrowser){
    for(const url of elmData.relURL){
      const absURL = (()=>{
        try{
          const cssFilePath = (()=>{
            if(elmData.type === 'fromCascadingStyleSheets'){
              return elmData.href;
            }
            return null;
          })();
          const _url = new URL(url, cssFilePath ?? page.url()).href as ValidURL; // isValidURLの処理も含んでいるはずなので、型アサーション
          return _url;
        }catch(e){
          return null;
        }
      })();
      elmData.absURLs.push(absURL);
    }
  }
  return dataFromHeadlessBrowser;
}