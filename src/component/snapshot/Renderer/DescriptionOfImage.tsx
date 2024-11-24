import { type MergedResultItem } from "@/component/snapshot/JSON";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";
import { ImageWithOption } from "./ImageWithOption";

const DescriptionOfImage:React.FC<{
  results:MergedResultItem[],
  getPath:ReturnType<typeof setGetPathToSendFile>
}> = ({results, getPath})=>{
  return (<>{
    results.map(({
      requestURL, type, tagName, relURL, href, responseURL, status, contentType, contentLength, shaHash, source, linkSourceIndex, archiveIndex, errorMessage
    })=>{
      if(contentType === undefined || contentType === null){return null;}
      const query = (()=>{
        if(archiveIndex !== null && archiveIndex !== undefined){
          return `contentType=${encodeURIComponent(contentType)}`;
        }
        else{
          // 画像がアーカイブされていないとき
          return '';
        }
      })();
      return (<div key={requestURL} className={style.imageItem}>
        <div className={style.imageItem__Block01}>
          <div className={style.imageItem__tagName}>{
            type === 'DOM_Attribute' && tagName !== undefined ? <>&lt;{tagName.toLowerCase()}&gt;で使用</>
            : type === 'fromCascadingStyleSheets' ? 'CSSで使用'
            : type === 'styleAttribute' ? 'style属性で使用'
            : undefined
          }</div>
          <div className={style.imageItem__previewBlock}>
            {(archiveIndex === null || archiveIndex === undefined) ?
              <>アーカイブ対象外などの要因で画像を表示できません</>
              : <ImageWithOption {...{archiveIndex,query,getPath}} />
            }
          </div>
        </div>
        <div className={style.imageItem__Block02}>
          <table className={style.imageItem__table}>
            <tbody>
              <tr><th>URL（リクエスト）</th><td>{requestURL}</td></tr>
              <tr><th>URL（サーバーリダイレクト後）</th><td>{requestURL === responseURL ? 'サーバーリダイレクト無' : responseURL}</td></tr>
              <tr><th>レスポンスステータス</th><td>{status}</td></tr>
              {
                type === 'fromCascadingStyleSheets' && href !== undefined ?
                <><tr><th>記述されているCSSファイル</th><td>{href === null ? 'インラインCSS' : href}</td></tr>
                <tr><th>CSSテキスト</th><td>{relURL}</td></tr></> : ''
              }
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
              <tr></tr>
            </tbody>
          </table>
        </div>
      </div>);
    }).filter((jsxElm)=>jsxElm!==null)
  }</>);
}

export {DescriptionOfImage}