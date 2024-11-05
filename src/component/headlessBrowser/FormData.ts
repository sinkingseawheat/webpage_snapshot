import type { BrowserContextOptions, ViewportSize, HTTPCredentials } from "playwright";
import type { Entries } from "@/utility/Types";
import type {ValidURL} from '@/component/snapshot/ScenarioFormData';

class FormDataError extends Error {
  static {
    this.prototype.name = 'FormDataError';
  }
}

/* エンドユーザへのレスポンス */
type ResponseData = {
  status:'OK',
  id:string,
  validURLs:ValidURL[],
  message:string,
} | {
  status: 'NG',
  message: string,
};

export type { ResponseData };


/* --------------- ブラウザコンテキスト --------------- */

const bCNames = [
  "baseURL",
  "ignoreHTTPSErrors",
  "userAgent",
  "viewportWidth", "viewportHeight",
] as const;
type BrowserContextPickedFormFields = Record<typeof bCNames[number], string>;
type BroserContextOptionPicked = Pick<BrowserContextOptions, "baseURL" | "ignoreHTTPSErrors" | "userAgent" | "viewport">;
type BroserContextOptionPicked_viewport = (null | ViewportSize) | undefined;

const browerContextDefaultFormFieldValue:BrowserContextPickedFormFields = (()=>{
  const temporary = bCNames.map(elm=>[elm,'']);
  return Object.fromEntries(temporary);
})();

const deserializeBrowserContextPickedFormFields = (bcFormFields:BrowserContextPickedFormFields):BroserContextOptionPicked=>{
  const rv:Partial<BroserContextOptionPicked> = {};
  const _viewport:BroserContextOptionPicked_viewport = {width:0,height:0};
  // react-hook-formは「.」を含めることで深いオブジェクトのフォームデータを作成できるはずが、エラー文言の表示などが上手く設定できないのでとりあえず浅いオブジェクトでデータを受け取る
  for(const [name, value] of Object.entries(bcFormFields) as Entries<BrowserContextPickedFormFields> ){
    const nestLevel = name.split('.').length - 1;
    if(nestLevel === 0){
      if(name === 'baseURL' || name === 'userAgent'){
        rv[name] = value;
      }else if(name === 'ignoreHTTPSErrors'){
        rv[name] = (value === 'on' || value === browerContextDefaultFormFieldValue["ignoreHTTPSErrors"]);
      }else if(name === 'viewportWidth'){
        _viewport.width = parseInt(value,10) || 0;
      }else if(name === 'viewportHeight'){
        _viewport.height = parseInt(value,10) || 0;
      }
    }else{
      throw new FormDataError(`${name}のフォームアイテムは定義されていません。ネストを表す「.」は無しのみ許可されています`);
    }
  }
  // 初期値と一緒または無効な組み合わせの場合は未定義で返す
  if(_viewport.width !== 0 && _viewport.height !== 0){
    rv.viewport = _viewport;
  }
  return rv;
}

export type { BroserContextOptionPicked, BrowserContextPickedFormFields };
export { bCNames, browerContextDefaultFormFieldValue, deserializeBrowserContextPickedFormFields };