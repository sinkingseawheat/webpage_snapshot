import type { BrowserContextOptions, Page, ViewportSize } from "playwright";

import type { Entries, ValidURL } from "@/utility/types/types";
import {isValidURL} from "@/utility/types/types";

import { scenarioDefaultFormFieldValue } from '@/component/snapshot/Renderer/InputForm';

type ScenarioFormFields = typeof scenarioDefaultFormFieldValue;


/* エンドユーザへのレスポンス */
type ResponseData = {
  id: string;
  validURLs: ValidURL[];
  message: string;
} | {
  message: string;
};
export type { ResponseData };


type ScenerioOption = {
  "urlsToOpen":ValidURL[],
  /* "scenarioIds":string[], */
  "referer"?:Required<Parameters<Page["goto"]>>[1]["referer"],
};

const deserializeScenerioFormFields = (sFormFields:ScenarioFormFields):ScenerioOption=>{
  const rv:ScenerioOption = {
    urlsToOpen: [],
    /* scenarioIds: [], */
  };
  const getArray = (arg:string|string[]):string[]=>{
    if(typeof arg === 'string'){
      return arg.split(/\r?\n/)
    }else{
      return arg;
    }
  }
  for(const [name, value] of Object.entries(sFormFields) as Entries<ScenarioFormFields>){
    switch(name){
      case('urlsToOpen'):
        const _urlsToOpen = getArray(value)
        .filter(line => !/^\s*$/.test(line))
        .map(line => line.trim())
        .filter(line => isValidURL(line));
        rv.urlsToOpen = Array.from(new Set<ValidURL>(_urlsToOpen)); // 重複削除
        break;
      case('referer'):
        if(isValidURL(value)){
          rv.referer = value;
        }
        break;
      /* default:
        throw new FormDataError(`${name}のフォームアイテムは定義されていません`); */
    }
  }
  return rv;
}


export type { ScenerioOption, ScenarioFormFields, ValidURL }
export { deserializeScenerioFormFields };
/* --------------- ブラウザコンテキスト --------------- */
const bCNames = [
  "baseURL",
  "ignoreHTTPSErrors",
  "userAgent",
  "viewportWidth", "viewportHeight",
] as const;
type BrowserContextPickedFormFields = Record<(typeof bCNames)[number], string>;
type BroserContextOptionPicked = Pick<BrowserContextOptions, "baseURL" | "ignoreHTTPSErrors" | "userAgent" | "viewport">;
type BroserContextOptionPicked_viewport = (null | ViewportSize) | undefined;
const browerContextDefaultFormFieldValue: BrowserContextPickedFormFields = (() => {
  const temporary = bCNames.map(elm => [elm, '']);
  return Object.fromEntries(temporary);
})();
const deserializeBrowserContextPickedFormFields = (bcFormFields: BrowserContextPickedFormFields): BroserContextOptionPicked => {
  const rv: Partial<BroserContextOptionPicked> = {};
  const _viewport: BroserContextOptionPicked_viewport = { width: 0, height: 0 };
  // react-hook-formは「.」を含めることで深いオブジェクトのフォームデータを作成できるはずが、エラー文言の表示などが上手く設定できないのでとりあえず浅いオブジェクトでデータを受け取る
  for (const [name, value] of Object.entries(bcFormFields) as Entries<BrowserContextPickedFormFields>) {
    const nestLevel = name.split('.').length - 1;
    if (nestLevel === 0) {
      if (name === 'baseURL' || name === 'userAgent') {
        rv[name] = value;
      } else if (name === 'ignoreHTTPSErrors') {
        rv[name] = (value === 'on' || value === browerContextDefaultFormFieldValue["ignoreHTTPSErrors"]);
      } else if (name === 'viewportWidth') {
        _viewport.width = parseInt(value, 10) || 0;
      } else if (name === 'viewportHeight') {
        _viewport.height = parseInt(value, 10) || 0;
      }
    } else {
      throw new FormDataError(`${name}のフォームアイテムは定義されていません。ネストを表す「.」は無しのみ許可されています`);
    }
  }
  // 初期値と一緒または無効な組み合わせの場合は未定義で返す
  if (_viewport.width !== 0 && _viewport.height !== 0) {
    rv.viewport = _viewport;
  }
  return rv;
};
export type { BroserContextOptionPicked, BrowserContextPickedFormFields };
export { bCNames, browerContextDefaultFormFieldValue, deserializeBrowserContextPickedFormFields };export class FormDataError extends Error {
    static {
      this.prototype.name = 'FormDataError';
    }
  }

