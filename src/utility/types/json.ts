import type { IndexOfURL } from './types';


export type MainResultJSON = {
  formData: { [k: string]: any; };
  version: string;
  targetURLs: [IndexOfURL, string][];
  links: any[];
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
    absURL: (string | null)[];
  } & ({
    type: 'DOM_Attribute';
    tagName: string;
  } | {
    type: 'fromCascadingStyleSheets';
    href: string | null;
  } | {
    type: 'styleAttribute';
  }));
};

