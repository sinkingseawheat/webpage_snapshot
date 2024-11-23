import Link from "next/link";
import { useState, useEffect } from "react";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'

import { RedirectStatus } from "./RedirectStatus";
import { DescriptionOfImage } from "./DescriptionOfImage";
import { DescriptionOfTextFile } from "./DescriptionOfTextFile";
import { DescriptionOfOtherFile } from "./DescriptionOfOtherFile";

import { getJSONData } from './sub/getJSONData';
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

import { PageResultRecordJSON, type URLsExtractedItem, type MainResultRecordJSON, type MergedResultItem} from '@/component/snapshot/JSON';


const PageResultOutput:React.FC<{
  selectedId: string,
  indexOfURL: string,
  mainResultRecordJSON: undefined | null | MainResultRecordJSON,
  errorMessageOfMainResult: string,
}> = ({selectedId, indexOfURL, mainResultRecordJSON, errorMessageOfMainResult})=>{

  const getPath = setGetPathToSendFile(selectedId);

  const [pageResultRecordJSON, setPageResultRecordJSON] = useState<undefined|null|PageResultRecordJSON>(undefined);
  const [errorMessageOfPageResult, setErrorMessageOfPageResult] = useState<string>('');
  const [isDOMtextExists, setIsDOMtextExists] = useState<boolean|undefined>(undefined);

  useEffect(()=>{
    try{
      (async ()=>{
        const [
          pageData,
          responseDOMtextExists,
        ] = await Promise.all([
          getJSONData({selectedId, relativeJSONPath:`${indexOfURL}/page.json`}),
          fetch(getPath(`${indexOfURL}/document_object_model.txt`))
        ]);
        const {jsonData:pageResultRecordJSON, errorMessage:errorMessageOfPageResult} = pageData;
        setPageResultRecordJSON(pageResultRecordJSON);
        setErrorMessageOfPageResult(errorMessageOfPageResult);
        setIsDOMtextExists(responseDOMtextExists.ok);
      })();
    }catch(e){
      setPageResultRecordJSON(null);
      setErrorMessageOfPageResult(errorMessageOfPageResult);
      setIsDOMtextExists(undefined);
    }
  }, [selectedId, indexOfURL]);

  if(mainResultRecordJSON === undefined || pageResultRecordJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultRecordJSON === null){
    return <>{errorMessageOfMainResult}</>
  }

  if(pageResultRecordJSON === null){
    return <>{errorMessageOfPageResult}</>
  }


  const {targetURLs, links:_links } = mainResultRecordJSON;
  const links:Map<string, Pick<MergedResultItem,'responseURL'|'status'|'contentType'|'contentLength'|'shaHash'|'source'|'linkSourceIndex'|'archiveIndex'|'errorMessage'>> = new Map();
  for(const _linksItem of _links){
    const {requestURL, ...value} = _linksItem
    links.set(requestURL, value);
  }
  const [, targetURL] = targetURLs?.find((targetURL)=>{return targetURL[0]===indexOfURL}) || [];

  const { redirectTransition, URLsRequestFromPage, URLsExtracted} = pageResultRecordJSON;
  const linksResult = new Map<string, Omit<MergedResultItem,'requestURL'>>();
  for(const connectedURL of URLsRequestFromPage){
    const result = links.get(connectedURL);
    if(result !== undefined){
      linksResult.set(connectedURL, result);
    }
  }
  for(const list of URLsExtracted){
    list.absURLs.forEach((url,index)=>{
      if(url===null){return null};
      const result:Pick<MergedResultItem,'type'|'tagName'|'href'|'relURL'> = {};
      result.type = list.type;
      if(list.type === 'DOM_Attribute'){
        result.tagName = list.tagName;
      }else if(list.type === 'fromCascadingStyleSheets'){
        result.href = list.href;
      }
      const prevResult = links.get(url);
      if(prevResult === undefined){
        linksResult.set(url, result); //既存の結果を優先してマージ
      }else{
        linksResult.set(url, {...result, ...prevResult}); //既存の結果を優先してマージ
      }
    });
  }
  const linksResultFlatted = Array.from(linksResult).map(([k,v])=>{
    return {
      requestURL:k,
      ...v
    }
  })
  const linksGroupingByContentType = (links === undefined) ?
    null
    : Object.groupBy(linksResultFlatted, (item)=>{
      const {contentType} = item;
      if(contentType === null || contentType === undefined){return 'other'}
      if(/^image/.test(contentType)){return 'image'}
      if(/^application\/javascript/.test(contentType)){return 'text'}
      if(/^application\/json/.test(contentType)){return 'text'}
      if(/^text/.test(contentType)){return 'text'}
      return 'other'
    })

  return (<>
    <div className={style['u-mt']}><Link className={style.textLink} href={`/snapshot/${selectedId.replace('-','/')}`}>&lt;メインの結果に移動する</Link></div>
    <p className={`${style.headingLv4} ${style['u-mt--large']}`}>「<span>{indexOfURL}</span>　<strong>{targetURL}</strong>」の結果です。</p>
    <section>
      <h5 className={style.headingLv3}>リダイレクト</h5>
      <div className={style.table}>
        {
          targetURL === undefined ?
          <>{`page.jsonにデータが存在しないため${targetURL}の結果はありません`}</>
          : <RedirectStatus {...{
            targetURL,
            redirectTransition :redirectTransition
          }} />
        }
      </div>
    </section>
    <section>
      <h5 className={style.headingLv3}>DocumentObjectModelテキスト</h5>
      <p>{
      isDOMtextExists === undefined ? 'ファイルの存在を確認中です'
      : isDOMtextExists === false ? 'ファイルが存在していません。アーカイブされていません'
      : (<Link target="_blank" className={style.textLink} href={getPath(`${indexOfURL}/document_object_model.txt`)+'?contentType='+encodeURIComponent('text/plain; charset=UTF-8')}>ファイルはこちらです</Link>)
      }</p>
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
        {
          linksGroupingByContentType === null || linksGroupingByContentType['image'] === undefined ?
          <>画像は検出されませんでした</>
          : <DescriptionOfImage {...{
            results: linksGroupingByContentType['image'],
            getPath,
          }}/>
        }
      </div>
    </section>
    <section>
      <h5 className={style.headingLv3}>テキストファイル</h5>
      <div>
        {
          linksGroupingByContentType === null || linksGroupingByContentType['text'] === undefined  ?
          <>テキストのファイルはありません</>
          : <DescriptionOfTextFile {...{
            results: linksGroupingByContentType["text"],
            getPath,
          }}/>
        }
      </div>
    </section>
    <section>
      <h5 className={style.headingLv3}>その他のファイル</h5>
      <p>ヘッダーのContent-Typeでフィルタリングを行っています。そのため、画像・テキストファイルがここに記載される場合もあります</p>
      <div>
        {
          linksGroupingByContentType === null || linksGroupingByContentType['other'] === undefined  ?
          <>テキストのファイルはありません</>
          : <DescriptionOfOtherFile {...{
            results: linksGroupingByContentType["other"],
            getPath,
          }}/>
        }
      </div>
    </section>
    </>
  );
}



export default PageResultOutput;