import { type IndexOfURL, type ValidURL } from '@/utility/types/types';
import { defaultFormFieldValues } from './FormData';

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
  contentLength: number,
  /** ファイルのハッシュ値 */
  shaHash: string|null,
} | {
  /** 通信が完了したらURL入れる。ただし、タイムアウトなどでレスポンスが得られなかったらnull */
  responseURL: null,
  /** リクエスト結果 */
  status?: number,
  /** Content-Type */
  contentType?: string,
  /** Content-Length */
  contentLength?: number,
  /** ファイルのハッシュ値 */
  shaHash?: string|null,
} | null;


export type LinksItem = {
  response: ResponseResult,
  /** ページからのリクエストか、ページから抽出したURLか */
  source: 'requestedFromPage'|'extracted',
  /** このURLへのアクセスが発生したページのindex */
  linkSourceIndex: Set<IndexOfURL>,
  /** アーカイブしたファイルはこのarchiveIndexにファイル名をリネームする */
  archiveIndex: number | null,
}


/** リクエスト全体に共通する結果 */
export type MainResultRecord = {
  formData: Omit<typeof defaultFormFieldValues, 'urlsToOpen'>,
  /** アプリのversion。package.jsonから取得 */
  version: string|null,
  /** ヘッドレスブラウザでリクエストするURLとそのindexの紐づけリスト */
  targetURLs: Map<ValidURL, IndexOfURL>,
  /** 各ページで読み込んだ、または設定されたリンクとそのレスポンス結果を格納する。keyは最初にリクエストしたURL。updateLinksで更新する */
  links: Map<string, LinksItem>,
};

/** リクエスト全体に共通する結果のJSON、Setは配列に、Map<K,V>はKを{requestURL:K}とした1階層のオブジェクトに変更 */
export type MainResultJSON = {
  formData: Omit<typeof defaultFormFieldValues, 'urlsToOpen'>;
  version: string;
  targetURLs: [IndexOfURL, string][];
  links: {
    requestURL: string,
    responseURL: string|null,
    status: number,
    contentType: string,
    contentLength: number,
    shaHash: string,
    source: 'requestedFromPage'|'extracted',
    linkSourceIndex: IndexOfURL[],
    archiveIndex: number | null,
  }[];
};

/** ページごとの結果 */
export type PageResultRecord = {
  firstRequested: {
    url: ValidURL,
    redirect: null
  } | {
    url: ValidURL,
    redirect: {
      count: number|null,
      transition: {
        url: string,
        status: number
      }[],
    },
  },
  URLRequestedFromPage: {
    /** ページ内で使用されているURL */
    requestedURLs: string[],
  },
  /** ページのDOM */
  DOM: {
    source: string,
  } | null,
  /** ページ内に記述されているURL。 */
  URLExtracted: URLExtractedItem[] | null,
  /** キャプチャ */
  PageCapture: {
    name: string,
    buffer: Buffer,
  }[] | null,
};

/** ページごとの結果のJSON */
export type PageResultRecordJSON = {
  firstRequested: {
    url: string,
    redirect: null
  } | {
    url: string,
    redirect: {
      count: number|null,
      transition: {
        url: string,
        status: number
      }[],
    },
  },
  URLRequestedFromPage: {
    requestedURLs: string[];
  };
  URLExtracted: URLExtractedJSONItem[] | null
};
// DOM、PageCaptureはJSONに保存不要

/** 抽出したURLについてのパラメータ */
type URLExtractedItem = {
  /** DOM要素から取得 */
  type: 'DOM_Attribute',
  /** DOM要素のHTMLタグ名 */
  tagName: string,
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURL: string[],
  /** relURLについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (ValidURL|null)[],
} | {
  /** CSSから取得の場合 */
  type: 'fromCascadingStyleSheets',
  /** CSSファイルのURL。nullの場合はHTMLのインラインstyle */
  href: string|null,
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURL: string[],
  /** relURLについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (ValidURL|null)[],
} | {
  /** style属性から取得 */
  type: 'styleAttribute',
  /** ファイルのURL。相対・ルート相対・data属性・javascript: ・#始まりなど、色々なパターンをそのまま挿入 */
  relURL: string[],
  /** relURLについて、targetURLをベースに変換可能であれば絶対パスに変換する。 */
  absURLs: (ValidURL|null)[],
};

/** 抽出したURLについてのパラメータのJSON */
type URLExtractedJSONItem = {
  type: 'DOM_Attribute',
  tagName: string,
  relURL: string[],
  absURLs: (string|null)[],
} | {
  type: 'fromCascadingStyleSheets',
  href: string|null,
  relURL: string[],
  absURLs: (string|null)[],
} | {
  type: 'styleAttribute',
  relURL: string[],
  absURLs: (string|null)[],
};