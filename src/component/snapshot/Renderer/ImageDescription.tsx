import { MainResultJSON } from "@/component/snapshot/JSON";
import { PageResultJSON } from "@/component/snapshot/JSON";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'
import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

const ImageDescription:React.FC<{
  selectedId:string,
  links:MainResultJSON["links"],
  urlExtracted:PageResultJSON["URLExtracted"],
  urlRequestedFromPage:PageResultJSON["URLRequestedFromPage"],
}> = ({selectedId, links, urlExtracted, urlRequestedFromPage})=>{
  const getPath = setGetPathToSendFile(selectedId);
  const dataMap:Map<string,{
    tagName?:string,
    responseURL?:string|null,
    shaHash?:string,
    contentType?:string,
    contentLength?:number,
    archiveIndex?:number|null,
  }> = new Map();
  for(const requestURL of urlRequestedFromPage?.['requestedURLs'] ?? []){
    dataMap.set(requestURL, {});
  }
  for(const extractedItem of urlExtracted ?? [] ){
    for(const absURL of extractedItem['absURLs']){
      if(absURL === null){continue;}
      if('tagName' in extractedItem){
        dataMap.set(absURL, {
          tagName: extractedItem?.tagName ?? '',
        });
      }else{
        dataMap.set(absURL, {});
      }
    }
  }
  for(const [requestURL, value] of dataMap){
    const {responseURL, shaHash, contentType, contentLength, archiveIndex} = getResponseFormRequestURL(links, requestURL) ?? {};
    dataMap.set(requestURL, {
      ...value,
      ...{
        responseURL,
        shaHash,
        contentType,
        contentLength,
        archiveIndex,
      }
    });
  }
  return (<>{
    Array.from(dataMap).map(([
      requestURL,
      {tagName, responseURL, shaHash, contentType, contentLength, archiveIndex}]
    )=>{
      // 画像のみを残す
      if( contentType===undefined || !/^image\//.test(contentType)){return null;}
      const query = (()=>{
        //Todo: 画像がない場合に表示する404画像を作成
        if(archiveIndex !== null || archiveIndex !== undefined){
          return `contentType=${encodeURIComponent(contentType)}`;
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
            {(archiveIndex === null || archiveIndex === undefined) ?
              <>アーカイブ対象外などの要因で画像を表示できません</>
              : <img src={getPath(`archive/${archiveIndex}?${query}`)} alt="" />
            }
          </div>
        </div>
        <div className={style.imageItem__Block02}>
          <table className={style.imageItem__table}>
            <tbody>
              <tr><th>URL（リクエスト）</th><td>{requestURL}</td></tr>
              <tr><th>URL（取得先）</th><td>{requestURL === responseURL ? '上と同じ' : responseURL}</td></tr>
              <tr><th>ハッシュ（sha-256）</th><td>{shaHash ?? `レスポンス無し`}</td></tr>
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