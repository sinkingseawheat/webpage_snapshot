import type { IndexOfURL } from './types';


export type MainResultJSON = {
  formData: { [k: string]: any; };
  version: string;
  targetURLs: [IndexOfURL, string][];
  links: {
    requestURL:string,
    response:{
      responseURL: string|null,
      status: number,
      contentType: string,
      contentLength: number,
      shaHash: string
    },
    source:'requestedFromPage'|'extracted',
    linkSourceIndex:IndexOfURL[],
  }[];
  listOfArchives:{
    requestURL:string,
    index:number,
    contentType:string,
  }[]
};

export type PageResultJSON = {
  firstRequested: {
    url: string;
    redirect: {
      count: number;
      transition: {
        url: string;
        status: number;
      }[];
    };
  };
  URLRequestedFromPage: {
    requestedURLs: string[];
  };
  URLExtracted: ({
    relURL: string[];
    absURLs: (string | null)[];
  } & ({
    type: 'DOM_Attribute';
    tagName: string;
  } | {
    type: 'fromCascadingStyleSheets';
    href: string | null;
  } | {
    type: 'styleAttribute';
  }))[];
};

