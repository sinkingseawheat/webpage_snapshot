import { useState, useEffect } from "react";
import path from "path";

import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";
import style from '@/styles/snapshot/Output.module.scss'

const ROOT_DIRECTORY = `/api/snapshot/sendFile`;


const PageResultOutput:React.FC<{
  selectedId:string,
  indexOfURL:string,
}> = ({selectedId, indexOfURL})=>{
  const getPath = (()=>{
    const rootPath = path.join(ROOT_DIRECTORY, selectedId.split('-').join('/'));
    return (relativePath:string) => path.join(rootPath, relativePath);
  })();
  const [resultJSON, setResultJSON] = useState<{mainResult:any,pageResult:any,archiveList:any}>({
    mainResult:null,
    pageResult:null,
    archiveList:null,
  });

  console.log(resultJSON);

  useEffect(()=>{
    (async ()=>{
      try{
        const [
          responseMainResult,
          responsePageResult,
          responseArchiveList,
        ] = await Promise.all([
          fetch(getPath('__main.json')),
          fetch(getPath(`${indexOfURL}/page.json`)),
          fetch(getPath(`archive/__list.json`)),
        ]);
        const [
          mainResult,
          pageResult,
          archiveList
        ] = await Promise.all([
          responseMainResult.json(),
          responsePageResult.json(),
          responseArchiveList.json(),
        ]);
        setResultJSON({
          mainResult,
          pageResult,
          archiveList,
        })
      }catch(e){
        console.error(e);
      }
    })();
  }, [selectedId, indexOfURL]);

  const [pageIndex, pageName] = resultJSON?.mainResult?.targetURLs?.find((targetURL:[string,string])=>{return targetURL[0]===indexOfURL}) || [];

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

class RedirectStatus{
  public isValid:boolean = true;
  private dataArray:{requestURL:string,status:number}[]=[];
  constructor(resultJSON:any){
    const links = resultJSON?.mainResult?.links;
    const {url, redirect} = resultJSON?.pageResult?.firstRequested ?? {};
    if(url===undefined || redirect===undefined){
      this.isValid = false;
      return;
    }
    const response = getResponseFormRequestURL(links, url);
    if(response === undefined){
      this.isValid = false;
      return;
    }
    this.dataArray.push({
      requestURL:response?.responseURL || '',
      status:response?.status || 0,
    });
    if(!Array.isArray(redirect?.transition)){
      this.isValid = false;
      return;
    }
    for(const state of redirect.transition){
      this.dataArray.push({
        requestURL: state.url,
        status: state.status
      });
    }
    // リダイレクトは最初のリクエストが上、最後のレスポンスが下に掲載させる
    this.dataArray.reverse();
  }

  public getPageSource = ()=>{
    if(!this.isValid){return '';}
    return (<table>
      <thead>
        <tr>
          <th>リクエストしたURL</th>
          <th>ステータス</th>
        </tr>
      </thead>
      <tbody>
      {this.dataArray.map((rowData)=>{
        return (
          <tr key={rowData.requestURL}>
            <td>{rowData.requestURL}</td>
            <td>{rowData.status}</td>
          </tr>
        );
      })}
    </tbody>
    </table>);
  }
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