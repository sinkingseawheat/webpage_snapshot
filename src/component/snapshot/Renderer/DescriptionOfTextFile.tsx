import Link from "next/link";
import { type MergedResultItem } from "@/component/snapshot/JSON";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

const DescriptionOfTextFile:React.FC<{
  results:MergedResultItem[],
  getPath:ReturnType<typeof setGetPathToSendFile>
}> = ({results, getPath})=>{
  return (<>{
    results.map(({
      requestURL, type, tagName, relURL, href, responseURL, status, contentType, contentLength, shaHash, source, linkSourceIndex, archiveIndex, errorMessage
    })=>{
      if(contentType === undefined || contentType === null){return null;}
      const query = (()=>{
        if(archiveIndex !== null || archiveIndex !== undefined){
          // return `contentType=${encodeURIComponent(contentType)}`;
          return `contentType=${encodeURIComponent('text/plain; charset=UTF-8')}`;
        }
        else{
          // アーカイブされていないとき
          return '';
        }
      })();
      return (<div key={requestURL}>
        <table className={style.imageItem__table}>
            <tbody>
              <tr><th>URL（リクエスト）</th><td>{archiveIndex !== null ? <Link target="_blank" className={style.textLink} href={getPath(`archive/${archiveIndex}?${query}`)}>{requestURL}</Link> : requestURL}</td></tr>
              <tr><th>URL（サーバーリダイレクト後）</th><td>{requestURL === responseURL ? 'サーバーリダイレクト無' : responseURL}</td></tr>
              <tr><th>レスポンスステータス</th><td>{status}</td></tr>
              <tr><th>ハッシュ（sha-256）</th><td>{shaHash ?? `取得できません`}</td></tr>
              <tr><th>Content-Type</th><td>{contentType ?? `取得できません`}</td></tr>
              <tr><th>Content-Length</th><td>{
              contentLength === -1 || contentLength === undefined || contentLength === null ?
                '取得できません'
                : contentLength.toString().replace(/(\d+?)(?=(\d{3})+(?!\d))/g,'$1,')+'byte'
              }</td></tr>
              <tr><th>データの取得方法</th><td>{
                source === 'extracted' ? 'ファイルのURLへの直接アクセス'
                : source === 'requestedFromPage' ? 'ページからのリクエスト'
                : '判別できませんでした'
              }</td></tr>
              {
                errorMessage !== '' && errorMessage !== undefined ?
                <tr><th>エラーメッセージ</th><td>{errorMessage}</td></tr>
                : ''
              }
            </tbody>
          </table>
      </div>);
    }).filter((jsxElm)=>jsxElm!==null)
  }</>);
}

export {DescriptionOfTextFile}