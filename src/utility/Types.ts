
type Entries<T> = (keyof T extends infer U ? (U extends keyof T ? [U,T[U]] : never) : never)[];

export type {Entries}


declare const validURLNominality: unique symbol;
/** 有効なURL（URLオブジェクトを生成可能なURL） */
type ValidURL = string & {
  [validURLNominality]:never,
};
function isValidURL(arg:string):arg is ValidURL{
  return URL.canParse(arg);
}

export type { ValidURL }
export { isValidURL }