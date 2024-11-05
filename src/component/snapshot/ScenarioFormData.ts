import type { Page } from "playwright";
import {URL} from "url";

import type { Entries, ValidURL } from "@/utility/Types";
import {isValidURL} from "@/utility/Types";

import { scenarioDefaultFormFieldValue } from './renderer';

type ScenarioFormFields = typeof scenarioDefaultFormFieldValue;


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