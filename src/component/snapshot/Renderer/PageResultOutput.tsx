import { useState, useEffect } from "react";
import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";
import style from '@/styles/snapshot/Output.module.scss'

import { RedirectStatus } from "./RedirectStatus";

import { getJSONData } from './sub/getJSONData';
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

import { PageResultJSON, type MainResultJSON } from '@/utility/types/json';

const PageResultOutput:React.FC<{
  selectedId: string,
  indexOfURL: string,
  mainResultJSON: undefined | null | MainResultJSON,
  errorMessageOfMainResult: string,
}> = ({selectedId, indexOfURL, mainResultJSON, errorMessageOfMainResult})=>{

  const getPath = setGetPathToSendFile(selectedId);

  const [pageResultJSON, setPageResultJSON] = useState<undefined|null|PageResultJSON>(undefined);
  const [errorMessageOfPageResult, setErrorMessageOfPageResult] = useState<string>('');

  const [archiveListJSON, setArchiveListJSON] = useState<undefined|null|{[k:string]:{index:number,contentType:string}}>(undefined);
  const [errorMessagearchiveList, setErrorMessagearchiveList] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const [
        pageData,
        archiveData,
      ] = await Promise.all([
        getJSONData({selectedId, relativeJSONPath:`${indexOfURL}/page.json`}),
        getJSONData({selectedId, relativeJSONPath:`archive/__list.json`}),
      ]);
      const {jsonData:pageResultJSON, errorMessage:errorMessageOfPageResult} = pageData;
      const {jsonData:archiveListJSON, errorMessage:errorMessageOfArchiveList} = archiveData;
      setPageResultJSON(pageResultJSON);
      setErrorMessageOfPageResult(errorMessageOfPageResult),
      setArchiveListJSON(archiveListJSON)
      setErrorMessagearchiveList(errorMessageOfArchiveList),
    })();
  }, [selectedId, indexOfURL]);

  if(mainResultJSON === undefined || pageResultJSON === undefined || archiveListJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultJSON === null){
    return <>{errorMessageOfMainResult}</>
  }

  if(pageResultJSON === null){
    return <>{errorMessageOfPageResult}</>
  }

  const [pageIndex, pageName] = mainResultJSON.targetURLs?.find((targetURL)=>{return targetURL[0]===indexOfURL}) || [];

  return (<>
    <p className={`${style.headingLv4} ${style['u-mt']}`}>「<span>{pageIndex}</span>　<strong>{pageName}</strong>」の結果です。</p>
    <section>
      <h5 className={style.headingLv3}>リダイレクト</h5>
      <div className={style.table}>
        {(new RedirectStatus(resultJSON)).getPageSource()}
      </div>
    </section>
    <section>
      <h5 className={style.headingLv3}>キャプチャ</h5>
      <div className={style.l_2column}>
        <figure>
          <img src={getPath(`${indexOfURL}/capture_fullpageColorSchemeIsLight.jpg`)} alt="" />
          <figcaption>prefers-color-scheme: light</figcaption>
        </figure>
        <figure>
          <img src={getPath(`${indexOfURL}/capture_fullpageColorSchemeIsDark.jpg`)} alt="" />
          <figcaption>prefers-color-scheme: dark</figcaption>
        </figure>
      </div>
    </section>
    <section>
      <h5 className={style.headingLv3}>画像（SVG含む）</h5>
      <div>
      {(new ImageDescription(resultJSON, getPath)).getPageSource()}
      </div>
    </section>
    </>
  );
}


class ImageDescription{
  public isValid:boolean = true;
  private archiveList!:{[k:string]:{index:number,contentType:string}};
  private dataArray:{
    tagName:string,
    requestURL:string,
    responseURL:string,
    hash:string,
    contentType:string,
    contentLength:number,
  }[]=[];
  constructor(resultJSON:any, private getPath:(relativePath:string)=>string){
    this.archiveList = resultJSON?.archiveList;
    const dataMap:Map<string, Partial<Omit<typeof this.dataArray[number], 'requestURL'>>> = new Map();
    const links = resultJSON?.mainResult?.links;
    const {URLExtracted, URLRequestedFromPage,} = resultJSON?.pageResult ?? {};

    if(URLExtracted===undefined || URLRequestedFromPage===undefined || links === undefined || this.archiveList === undefined){
      this.isValid = false;
      return;
    }
    for(const requestURL of URLRequestedFromPage['requestedURLs']){
      dataMap.set(requestURL, {});
    }
    for(const extractedItem of URLExtracted ){
      for(const _url of extractedItem['absURL']){
        dataMap.set(_url, {
          tagName: extractedItem['tagName'],
        });
      }
    }
    for(const [requestURL, value] of dataMap){
      const response = getResponseFormRequestURL(links, requestURL);
      dataMap.set(requestURL, {
        ...value,
        ...{
          responseURL: response?.['responseURL'],
          hash: response?.['shaHash'],
          contentType: response?.['contentType'],
          contentLength: response?.['contentLength'],
        }
      } as any);
    }
    for(const [requestURL, value] of dataMap){
      this.dataArray.push({
        tagName:value?.['tagName'] || `タグ無し`,
        requestURL:requestURL,
        responseURL:value?.['responseURL'] || `レスポンス無し`,
        hash:value?.['hash'] || `レスポンス無し`,
        contentType:value?.['contentType'] || `レスポンス無し`,
        contentLength:value?.['contentLength'] || -1,
      });
    }
  }

  public getPageSource = ()=>{
    if(!this.isValid){
      return <></>;
    }
    return (
      <>
      {this.dataArray.map((item, index)=>{
        const {tagName, requestURL, responseURL, hash, contentType, contentLength} = item;
        if(!/^image\//.test(contentType)){return null;}
        const archiveItem = (()=>{
          for(const [url, value] of Object.entries(this.archiveList)){
            if(requestURL === url){
              return value;
            }
          }
        })();
        if(archiveItem === undefined){
          console.log(`archiveItemが見つかりませんでした`)
          return null;
        }
        const archiveIndex = archiveItem['index'];
        const query = `contentType=${encodeURIComponent(archiveItem['contentType'])}`;
        return (
            <div key={requestURL + index} className={style.imageItem}>
              <div className={style.imageItem__Block01}>
                <div className={style.imageItem__tagName}>{tagName}</div>
                <div className={style.imageItem__preview}><img src={this.getPath(`archive/${archiveIndex}?${query}`)} alt="" /></div>
              </div>
              <div className={style.imageItem__Block02}>
                <table className={style.imageItem__table}>
                  <tbody>
                    <tr><th>URL（リクエスト）</th><td>{requestURL}</td></tr>
                    <tr><th>URL（取得先）</th><td>{requestURL === responseURL ? '上と同じ' : responseURL}</td></tr>
                    <tr><th>ハッシュ（sha-256）</th><td>{hash}</td></tr>
                    <tr><th>Content-Type</th><td>{contentType}</td></tr>
                    <tr><th>Content-Length</th><td>{
                    contentLength === -1 ?
                      'レスポンス無し'
                      : contentLength.toString().replace(/(\d+?)(?=(\d{3})+(?!\d))/g,'$1,')+'byte'
                    }</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
        );
      }).filter((jsxElm)=>jsxElm!==null)}
      </>
    );
  }
}

export default PageResultOutput;