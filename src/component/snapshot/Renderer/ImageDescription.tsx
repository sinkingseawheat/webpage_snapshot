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
  listOfArchives:MainResultJSON['listOfArchives'],
}> = ({selectedId, links, urlExtracted, urlRequestedFromPage, listOfArchives})=>{
  const getPath = setGetPathToSendFile(selectedId);
  const getArchiveItem = (requestURL:string)=>{
    for(const item of listOfArchives){
      if(requestURL === item.requestURL){
        const {index, contentType} = item;
        return {index, contentType};
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
      const archiveItem = getArchiveItem(requestURL);
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

export {ImageDescription}