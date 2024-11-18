import type { BrowserContextOptions, Page, ViewportSize } from "playwright";

import type { Entries, ValidURL } from "@/utility/types/types";
import {isValidURL} from "@/utility/types/types";

class FormDataError extends Error {
  static {
    this.prototype.name = 'FormDataError';
  }
}

/* エンドユーザへのレスポンス */
type ResponseData = {
  id: string;
  validURLs: ValidURL[];
  message: string;
} | {
  message: string;
};

// Scenario
const scenarioNames = [
  'urlsToOpen',
  'referer'
] as const;
const deserializeScenerioFormFields = (
  sFormFields:Pick<FormFieldValue,'urlsToOpen'|'referer'>
):{
  "urlsToOpen":ValidURL[],
  "referer"?:Required<Parameters<Page["goto"]>>[1]["referer"],
}=>{
  const getArray = (arg:string|string[]):string[]=>{
    if(typeof arg === 'string'){
      return arg.split(/\r?\n/)
    }else{
      return arg;
    }
  }
  const _urlsToOpen = getArray(sFormFields['urlsToOpen'])
    .filter(line => !/^\s*$/.test(line))
    .map(line => line.trim())
    .filter(line => isValidURL(line));
  const urlsToOpen = Array.from(new Set<ValidURL>(_urlsToOpen));

  const _referer = sFormFields['referer']
  if(_referer === undefined){
    return {
      urlsToOpen,
    }
  }
  if(Array.isArray(_referer)){
    throw new FormDataError(`refererは1つのURLのみ設定可能です`)
  }
  const referer = isValidURL(_referer) ? _referer : undefined;
  return {
    urlsToOpen,
    referer
  };
}

// BrowserContext
const browserContextNames = [
  "ignoreHTTPSErrors",
  "userAgent",
  "viewportWidth", "viewportHeight",
] as const;
const Names = [...scenarioNames, ...browserContextNames];
type FormFieldValue = Record<(typeof Names)[number], string|string[]>;
const defaultFormFieldValues = {
  'urlsToOpen':'',
  'referer':'',
  "ignoreHTTPSErrors":'',
  "userAgent":'',
  "viewportWidth":'',
  "viewportHeight":'',
} satisfies FormFieldValue;
const deserializeBrowserContextPickedFormFields = (
  bcFormFields:Pick<FormFieldValue,'ignoreHTTPSErrors'|'userAgent'|'viewportWidth'|'viewportHeight'>
):Pick<BrowserContextOptions, "ignoreHTTPSErrors" | "userAgent" | "viewport"> =>{
  const _ignoreHTTPSErrors = bcFormFields['ignoreHTTPSErrors'];
  const _userAgent = bcFormFields['userAgent'];
  const _viewportWidth = bcFormFields['viewportWidth'];
  const _viewportHeight = bcFormFields['viewportHeight'];
  if(
    Array.isArray(_ignoreHTTPSErrors)
    || Array.isArray(_userAgent)
    || Array.isArray(_viewportWidth)
    || Array.isArray(_viewportHeight)
  ){
    throw new Error(`bcFormFieldsの引数の値に文字列のみです`)
  }
  const ignoreHTTPSErrors = (_ignoreHTTPSErrors === 'on' || _ignoreHTTPSErrors === defaultFormFieldValues['ignoreHTTPSErrors']) ? true : false;
  const userAgent = _userAgent === '' ? undefined : _userAgent;
  const viewportWidth = parseInt(_viewportWidth) || 0;
  const viewportHeight = parseInt(_viewportHeight) || 0;
  const _viewport = { width:viewportWidth, height:viewportHeight };
  const viewport = (viewportWidth === 0 || viewportHeight === 0) ? undefined : _viewport;
  return {
    ignoreHTTPSErrors,
    userAgent,
    viewport,
  };
};

export type { ResponseData };
export {
  defaultFormFieldValues,
  deserializeScenerioFormFields,
  deserializeBrowserContextPickedFormFields
}

