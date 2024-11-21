
export type Entries<T> = (keyof T extends infer U ? (U extends keyof T ? [U,T[U]] : never) : never)[];
export type ValueOfMap<T> = T extends Map<any,infer U> ? U : never;



declare const validURLNominality: unique symbol;
/** 有効なURL（URLオブジェクトを生成可能なURL） */
type ValidURL = string & {
  [validURLNominality]:never,
};
function isValidURL(arg:any):arg is ValidURL{
  if(typeof arg !== 'string'){return false;}
  return URL.canParse(arg);
}

export type { ValidURL }
export { isValidURL }

declare const IndexOfURLNormality: unique symbol;
/* ブラウザで読み込む対象URLと1対1で紐づいた、'010'など数字のみで構成された文字列 */
export type IndexOfURL = string & {
  IndexOfURLNormality: never;
};
export const isIndexOfURL = (arg: any): arg is IndexOfURL => {
  if(typeof arg !== 'string'){return false;}
  return /^\d+$/.test(arg);
};

/** 処理完了後に生成されるファイル。処理が正常に完了しているかを確認できる */
export const DOT_FILE_PROCESS_COMPLETED = '.completed' as const;

const errorMessage = [
  '',
  '[unplanned]',
  '[no resopnse]',
  '[too many redirects]',
  'net::ERR_FAILED',
  'ERR_INVALID_AUTH_CREDENTIALS',
  '[on requestfailed]',
  '[request is pending]',
  '[no responseBody found request from page]',
  '[no need to request url]',
  '[TimeoutError]',
] as const;
export type ErrorMessage = (typeof errorMessage)[number];
export function isErrorMessage(args:any):args is ErrorMessage{
  if(typeof args !== 'string'){return false;}
  if([...errorMessage, ''].includes(args)){ // includesはconstの変数に対してはエラーが出て無意味なので、スプレッド構文でstring[]にワイドニングする
    return true;
  }
  return false;
}