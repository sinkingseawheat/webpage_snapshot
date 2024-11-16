
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

declare const IndexOfURLNormality: unique symbol;
/* ブラウザで読み込む対象URLと1対1で紐づいた、'010'など数字のみで構成された文字列 */
export type IndexOfURL = string & {
  IndexOfURLNormality: never;
};
export const isIndexOfURL = (arg: string): arg is IndexOfURL => {
  return /^\d+$/.test(arg);
};
/** 処理開始時に作成され、処理完了時に削除されるファイル */

export const DOT_FILE_WHILE_PROCESSING = '.running' as const;
