import { useState, useEffect } from "react";
import style from '@/component/snapshot/Renderer/style/Output.module.scss'

import { RedirectStatus } from "./RedirectStatus";
import { ImageDescription } from "./ImageDescription";

import { getJSONData } from './sub/getJSONData';
import { setGetPathToSendFile } from "./sub/setGetPathToSendFile";

import { PageResultRecordJSON, type MainResultJSON } from '@/component/snapshot/JSON';

const PageResultOutput:React.FC<{
  selectedId: string,
  indexOfURL: string,
  mainResultJSON: undefined | null | MainResultJSON,
  errorMessageOfMainResult: string,
}> = ({selectedId, indexOfURL, mainResultJSON, errorMessageOfMainResult})=>{

  const getPath = setGetPathToSendFile(selectedId);

  const [pageResultJSON, setPageResultRecordJSON] = useState<undefined|null|PageResultRecordJSON>(undefined);
  const [errorMessageOfPageResult, setErrorMessageOfPageResult] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const [
        pageData,
      ] = await Promise.all([
        getJSONData({selectedId, relativeJSONPath:`${indexOfURL}/page.json`}),
      ]);
      const {jsonData:pageResultJSON, errorMessage:errorMessageOfPageResult} = pageData;
      setPageResultRecordJSON(pageResultJSON);
      setErrorMessageOfPageResult(errorMessageOfPageResult);
    })();
  }, [selectedId, indexOfURL]);

  if(mainResultJSON === undefined || pageResultJSON === undefined){
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
    <p className={`${style.headingLv4} ${style['u-mt--large']}`}>「<span>{pageIndex}</span>　<strong>{pageName}</strong>」の結果です。</p>
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
       }}/>
      </div>
    </section>
    </>
  );
}



export default PageResultOutput;