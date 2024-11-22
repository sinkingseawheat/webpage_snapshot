import Link from "next/link";
import { type MergedResultItem } from "@/component/snapshot/JSON";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

const DescriptionOfTextFile:React.FC<{
  results:MergedResultItem[],
  getPath:ReturnType<typeof setGetPathToSendFile>
}> = ({results, getPath})=>{
  return (<div className={style.table}>
    <table>
      <thead>
        <tr>
          <th>URL（リクエスト）</th>
          <th>URL（サーバーリダイレクト後）</th>
          <th>レスポンスステータス</th>
          <th>ハッシュ（sha-256）</th>
          <th>Content-Type</th>
          <th>Content-Length</th>
          <th>データの取得方法</th>
          <th>エラーメッセージ</th>
        </tr>
      </thead>
      <tbody>
        {results.map(({
    requestURL, type, tagName, relURL, href, responseURL, status, contentType, contentLength, shaHash, source, linkSourceIndex, archiveIndex, errorMessage
  })=>{
        return (<tr key={requestURL}>
          <td className={style["table__data--url"]}>{archiveIndex !== null && archiveIndex !== undefined ? <Link target="_blank" className={style.textLink} href={getPath(`archive/${archiveIndex}?contentType=${encodeURIComponent('text/plain; charset=UTF-8')}`)}>{requestURL}</Link> : requestURL}</td>
          <td className={style["table__data--url"]}>{requestURL === responseURL ? 'サーバーリダイレクト無' : responseURL}</td>
          <td>{status ?? '取得できません'}</td>
          <td className={style["table__data--url"]}>{shaHash ?? `取得できません`}</td>
          <td>{contentType ?? `取得できません`}</td>
          <td>{
          contentLength === -1 || contentLength === undefined || contentLength === null ?
            '取得できません'
            : contentLength.toString().replace(/(\d+?)(?=(\d{3})+(?!\d))/g,'$1,')+'byte'
          }</td>
          <td>{
            source === 'extracted' ? 'ファイルのURLへの直接アクセス'
            : source === 'requestedFromPage' ? 'ページからのリクエスト'
            : '判別できませんでした'
          }</td>
          <td>{errorMessage !== '' && errorMessage !== undefined ? errorMessage : '無し'}</td>
        </tr>);
        })}
        <tr></tr>
      </tbody>
    </table>
  </div>);
}

export {DescriptionOfTextFile}