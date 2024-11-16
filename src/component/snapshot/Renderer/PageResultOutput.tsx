import { useState, useEffect } from "react";
import style from '@/styles/snapshot/Output.module.scss'

import { RedirectStatus } from "./RedirectStatus";
import { ImageDescription } from "./ImageDescription";

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
      setErrorMessageOfPageResult(errorMessageOfPageResult);
      setArchiveListJSON(archiveListJSON);
      setErrorMessagearchiveList(errorMessageOfArchiveList);
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
        <RedirectStatus {...{
          links: mainResultJSON['links'],
          firstRequested :pageResultJSON['firstRequested']
        }} />
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
       <ImageDescription {...{
        selectedId,
        links: mainResultJSON['links'],
        urlExtracted: pageResultJSON['URLExtracted'],
        urlRequestedFromPage: pageResultJSON['URLRequestedFromPage'],
        archiveListJSON
       }}/>
      </div>
    </section>
    </>
  );
}



export default PageResultOutput;