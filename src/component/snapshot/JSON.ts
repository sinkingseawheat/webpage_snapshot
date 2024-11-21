import { isErrorMessage, type ErrorMessage, isValidURL, type IndexOfURL, type ValidURL } from '@/utility/types/types';
import { defaultFormFieldValues } from './FormData';
import { isIndexOfURL } from '@/utility/types/types';

// Main Result

/** 未リクエストの場合はnull。それ以外はオブジェクト */
type ResponseResult = {
  /** 通信が完了したらURL入れる。ただし、タイムアウトなどでレスポンスが得られなかったらnull */
  responseURL: string,
  /** リクエスト結果 */
  status: number,
  /** Content-Type */
  contentType: string,
  /** Content-Length */
  contentLength: number | null,
  /** ファイルのハッシュ値 */
  shaHash: string | null,
} | {
  /** 通信はまだ */
  responseURL: null
} | null;

function isResponseResult(args:any):args is ResponseResult{
  try{
    if(args === null){return true;}
    if(typeof args !== 'object'){return false;} // nullの場合は省いているのでプロパアクセサーが使える場合のみ残る
    const {responseURL, status, contentType, contentLength, shaHash} = args;
    if(typeof responseURL === 'string'){
      if(
        typeof status === 'number'
        && typeof contentType === 'string'
        && (contentLength === null || typeof contentLength === 'number')
        && (shaHash === null || typeof shaHash === 'string')
      ){
        return true;
      }
    }else if(responseURL === null){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}


type LinksItem = {
  response: ResponseResult,
  /** ページからのリクエストか、ページから抽出したURLか */
  source: 'requestedFromPage'|'extracted',
  /** このURLへのアクセスが発生したページのindex */
  linkSourceIndex: Set<IndexOfURL>,
  /** アーカイブしたファイルはこのarchiveIndexにファイル名をリネームする */
  archiveIndex: number | null,
  /** タイムアウト・Basic認証失敗などのメッセージを格納。requestedFromPageの場合はPage、extractedの場合はファイルそのもののエラー */
  errorMessage: ErrorMessage,
}

function isLinksItem(args:any):args is LinksItem{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {response, source, linkSourceIndex, archiveIndex, errorMessage} = args;
    if(
      isResponseResult(response)
      && ['requestedFromPage','extracted'].includes(source)
      && linkSourceIndex instanceof Set && Array.from(linkSourceIndex).every((elm)=>isIndexOfURL(elm))
      && (typeof archiveIndex === 'number' || archiveIndex === null)
      && isErrorMessage(errorMessage)
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}

/** リクエスト全体に共通する結果 */
export type MainResultRecord = {
  formData: Omit<typeof defaultFormFieldValues, 'urlsToOpen'>,
  /** アプリのversion。package.jsonから取得 */
  version: string | null,
  /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
  targetURLs: Map<ValidURL, IndexOfURL>,
  /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL。updateLinksで更新する */
  links: Map<string, LinksItem>,
};

function isMainResultRecord(args:any):args is MainResultRecord{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {formData, version, targetURLs, links} = args;
    if(typeof formData !== 'object' && formData === null){return false;}
    if(
      Object.keys(defaultFormFieldValues).every((name)=>(name in formData || name === 'urlsToOpen')) // defaultFormFieldValuesに存在しないkey:valueがformDataに含まれていても不問とする
      && (typeof version === 'string' || version === null)
      && targetURLs instanceof Map && Array.from(targetURLs).every(([k,v])=>(typeof k === 'string' && isIndexOfURL(v)))
      && links instanceof Map && Array.from(links).every(([k,v]) => (typeof k === 'string' && isLinksItem(v)))
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}

/** リクエスト全体に共通する結果のJSON、Setは配列に、Map<K,V>はKを{requestURL:K}とした1階層のオブジェクトに変更 */
export type MainResultRecordJSON = {
  formData: Omit<typeof defaultFormFieldValues, 'urlsToOpen'>;
  version: string|null;
  targetURLs: [string, string][];
  links: {
    requestURL: string,
    responseURL: string | null,
    status: number | null,
    contentType: string | null,
    contentLength: number | null,
    shaHash: string | null,
    source: 'requestedFromPage'|'extracted',
    linkSourceIndex: string[],
    archiveIndex: number | null,
    errorMessage: ErrorMessage,
  }[];
};

export function isMainResultRecordJSON(args:any):args is MainResultRecordJSON{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {formData, version, targetURLs, links} = args;
    if(typeof formData !== 'object' && formData === null){return false;}
    if(
      Object.keys(defaultFormFieldValues).every((name)=>(name in formData || name === 'urlsToOpen')) // defaultFormFieldValuesに存在しないkey:valueがformDataに含まれていても不問とする
      && (typeof version === 'string' || version === null)
      && Array.isArray(targetURLs) && targetURLs.every(([k,v])=>(typeof k === 'string' && typeof v === 'string'))
      && Array.isArray(links) && links.every((link)=>{
        const {requestURL, responseURL, status, contentType, contentLength, shaHash, source, linkSourceIndex, archiveIndex, errorMessage,} = link;
        return (
          typeof requestURL === 'string'
          && (typeof responseURL === 'string' || responseURL === null)
          && (typeof status === 'number' || status === null)
          && (typeof contentType === 'string' || contentType === null)
          && (typeof contentLength === 'number' || contentLength === null)
          && (typeof shaHash === 'string' || shaHash === null)
          && (source === 'requestedFromPage' || source === 'extracted')
          && (Array.isArray(linkSourceIndex) && linkSourceIndex.every((indexOfURL) => typeof indexOfURL === 'string'))
          && (typeof archiveIndex === 'number' || archiveIndex === null)
          && isErrorMessage(errorMessage)
        );
      })
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}

export function getMainResultRecordJSON(record:MainResultRecord):MainResultRecordJSON{
  const {formData, version, targetURLs:_targetURLs, links:_links} = record
  const targetURLs:[string, string][] = [];
  for(const [url, indexOfURL] of _targetURLs){
    targetURLs.push([indexOfURL,url]); // indexOfURLは項番の意味合いもあるので、最初の要素に配置
  }
  const links:{
    requestURL: string,
    responseURL: string | null,
    status: number | null,
    contentType: string | null,
    contentLength: number | null,
    shaHash: string | null,
    source: 'requestedFromPage'|'extracted',
    linkSourceIndex: string[],
    archiveIndex: number | null,
    errorMessage: ErrorMessage,
  }[] = [];
  for(const [requestURL, linksItem] of _links){
    const {response, source, linkSourceIndex:_linkSourceIndex, archiveIndex, errorMessage} = linksItem;
    const {responseURL, status, contentType, contentLength, shaHash,} = (response === null || response.responseURL === null) ?
      {responseURL : null, status : null, contentType : null, contentLength : null, shaHash : null,}
      : response;
    const linkSourceIndex:string[] = [];
    for(const indexOfURL of _linkSourceIndex){
      linkSourceIndex.push(indexOfURL);
    }
    _linkSourceIndex
    links.push({
      requestURL,
      responseURL: responseURL ?? null,
      status: status ?? null,
      contentType: contentType ?? null,
      contentLength: contentLength ?? null,
      shaHash: shaHash ?? null,
      source: source ?? null,
      linkSourceIndex: linkSourceIndex ?? null,
      archiveIndex: archiveIndex ?? null,
      errorMessage: errorMessage ?? null,
    })
  }
  return {
    formData,
    version,
    targetURLs,
    links,
  }
}



/** ページごとの結果 */
export type PageResultRecord = {
  redirectTransition: {
    url: string, //レスポンスの格納なのでstring型で問題ない
    status: number
  }[]
  /** ページ内で使用されているURL */
  URLsRequestFromPage: ValidURL[],
  /** ページのDOM */
  DOMtext: string | null,
  /** ページ内に記述されているURL。 */
  URLsExtracted: URLsExtractedItem[],
  /** キャプチャ */
  pageCapture: {
    name: string,
    buffer: Buffer,
  }[],
};

function isPageResultRecord(args:any):args is PageResultRecord{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {redirectTransition, URLsRequestFromPage, DOMtext, URLsExtracted, pageCapture} = args;
    if(typeof redirectTransition !== 'object' && redirectTransition === null){return false;}
    if(
      Array.isArray(redirectTransition) && redirectTransition.every(transition => (typeof transition?.url === 'string' && typeof transition?.status === 'number'))
      && Array.isArray(URLsRequestFromPage) && URLsRequestFromPage.every((url) => isValidURL(url))
      && (typeof DOMtext === 'string' || DOMtext === null)
      && Array.isArray(URLsExtracted) && URLsExtracted.every((item) => isURLsExtractedItem(item))
      && Array.isArray(pageCapture) && pageCapture.every((item) => (typeof item?.name === 'string' && item?.buffer instanceof Buffer))
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}



/** ページごとの結果のJSON */
export type PageResultRecordJSON = {
  redirectTransition: {
    url: string,
    status: number
  }[],
  URLsRequestFromPage: string[],
  URLsExtracted: URLsExtractedItem<string>[]
};
// DOM、pageCaptureはJSONに保存不要


export function isPageResultRecordJSON(args:any):args is PageResultRecordJSON{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {redirectTransition, URLsRequestFromPage, URLsExtracted} = args;
    if(
      Array.isArray(redirectTransition) && redirectTransition.every(transition => (typeof transition?.url === 'string' && typeof transition?.status === 'number'))
      && Array.isArray(URLsRequestFromPage) && URLsRequestFromPage.every((url) => typeof url === 'string')
      && Array.isArray(URLsExtracted) && URLsExtracted.every((item) => isURLsExtractedItem(item))
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}

export function getPageResultRecordJSON(record:PageResultRecord):PageResultRecordJSON{
  const {redirectTransition, URLsRequestFromPage, URLsExtracted} = record;
  return {
    redirectTransition,
    URLsRequestFromPage,
    URLsExtracted,
  }
}

/** 抽出したURLについてのパラメータ */
export type URLsExtractedItem<T=ValidURL> = {
  /** DOM要素から取得 */
  type: 'DOM_Attribute',
  /** DOM要素のHTMLタグ名 */
  tagName: string,
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURLs: string[],
  /** relURLsについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (T|null)[],
} | {
  /** CSSから取得の場合 */
  type: 'fromCascadingStyleSheets',
  /** CSSファイルのURL。nullの場合はHTMLのインラインstyle */
  href: string|null,
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURLs: string[],
  /** relURLsについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (T|null)[],
} | {
  /** style属性から取得 */
  type: 'styleAttribute',
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURLs: string[],
  /** relURLsについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (T|null)[],
};

function isURLsExtractedItem(args:any):args is URLsExtractedItem{
  try{
    if(typeof args !== 'object' && args === null){return false;}
    const {type, relURLs, absURLs, tagName, href} = args;
    if(
      ['DOM_Attribute', 'fromCascadingStyleSheets', 'styleAttribute'].includes(type)
      && Array.isArray(relURLs) && relURLs.every((url) => typeof url === 'string')
      && Array.isArray(absURLs) && absURLs.every((url) => (isValidURL(url) || url === null))
      && (
        (type === 'DOM_Attribute' && typeof tagName === 'string')
        || (type === 'fromCascadingStyleSheets' && (typeof href === 'string' || href === null))
      )
    ){
      return true;
    }
    return false;
  }catch(e){
    console.error(e);
    return false;
  }
}

export type MergedResultItem = {
  requestURL:string,
  type?:'DOM_Attribute'|'fromCascadingStyleSheets'|'styleAttribute',
  tagName?:string,
  relURL?:string,
  href?: string|null,
  responseURL?: string | null,
  status?: number | null,
  contentType?: string | null,
  contentLength?: number | null,
  shaHash?: string | null,
  source?: 'requestedFromPage'|'extracted',
  linkSourceIndex?: string[],
  archiveIndex?: number | null,
  errorMessage?: ErrorMessage,
}