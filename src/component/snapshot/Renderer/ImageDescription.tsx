import { MainResultJSON } from "@/utility/types/json";
import { PageResultJSON } from "@/utility/types/json";
import style from '@/styles/snapshot/Output.module.scss'
import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

const ImageDescription:React.FC<{
  selectedId:string,
  links:MainResultJSON["links"],
  urlExtracted:PageResultJSON["URLExtracted"],
  urlRequestedFromPage:PageResultJSON["URLRequestedFromPage"],
  archiveListJSON:{[k: string]: {
    index: number;
    contentType: string;
  }}|null
}> = ({selectedId, links, urlExtracted, urlRequestedFromPage, archiveListJSON})=>{
  const getPath = setGetPathToSendFile(selectedId);
  const getArchiveIndex = (requestURL:string)=>{
    if(archiveListJSON === null){
      return null;
    }
    for(const [url, value] of Object.entries(archiveListJSON)){
      if(requestURL === url){
        return value;
      }
    }
    return null;
  }
  const dataMap:Map<string,{
    tagName?:string,
    responseURL?:string|null,
    hash?:string,
    contentType?:string,
    contentLength?:number,
  }> = new Map();
  for(const requestURL of urlRequestedFromPage['requestedURLs']){
    dataMap.set(requestURL, {});
  }
  for(const extractedItem of urlExtracted ){
    for(const _url of extractedItem['absURL']){
      if(_url === null){continue;}
      if('tagName' in extractedItem){
        dataMap.set(_url, {
          tagName: extractedItem?.tagName ?? '',
        });
      }else{
        dataMap.set(_url, {});
      }
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
    });
  }
  return (<>{
    Array.from(dataMap).map(([
      requestURL,
      {tagName, responseURL, hash, contentType, contentLength}]
    )=>{
      // 画像のみを残す
      if( contentType===undefined || !/^image\//.test(contentType)){return null;}
      const archiveItem = getArchiveIndex(requestURL);
      const query = (()=>{
        if(archiveItem !== null){
          return `contentType=${encodeURIComponent(archiveItem['contentType'])}`;
        }
        else{
          return '';
        }
      })();
      // Todo: アーカイブファイル無しのときの画像を作成
      return (<div key={requestURL} className={style.imageItem}>
        <div className={style.imageItem__Block01}>
          <div className={style.imageItem__tagName}>{tagName ?? `タグ名無し`}</div>
          <div className={style.imageItem__preview}>
            {archiveItem === null ?
              <></>
              : <img src={getPath(`archive/${archiveItem['index']}?${query}`)} alt="" />
            }
          </div>
        </div>
        <div className={style.imageItem__Block02}>
          <table className={style.imageItem__table}>
            <tbody>
              <tr><th>URL（リクエスト）</th><td>{requestURL}</td></tr>
              <tr><th>URL（取得先）</th><td>{requestURL === responseURL ? '上と同じ' : responseURL}</td></tr>
              <tr><th>ハッシュ（sha-256）</th><td>{hash ?? `レスポンス無し`}</td></tr>
              <tr><th>Content-Type</th><td>{contentType ?? `レスポンス無し`}</td></tr>
              <tr><th>Content-Length</th><td>{
              contentLength === -1 || contentLength === undefined ?
                'レスポンス無し'
                : contentLength.toString().replace(/(\d+?)(?=(\d{3})+(?!\d))/g,'$1,')+'byte'
              }</td></tr>
            </tbody>
          </table>
        </div>
      </div>);
    }).filter((jsxElm)=>jsxElm!==null)
  }</>);
}

class bk_ImageDescription{
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
    const {urlExtracted, urlRequestedFromPage,} = resultJSON?.pageResult ?? {};

    if(urlExtracted===undefined || URLRequestedFromPage===undefined || links === undefined || this.archiveList === undefined){
      this.isValid = false;
      return;
    }
    for(const requestURL of URLRequestedFromPage['requestedURLs']){
      dataMap.set(requestURL, {});
    }
    for(const extractedItem of urlExtracted ){
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

export {ImageDescription}