

import { TargetURLs } from './TargetURLs';
import { FormFieldSource } from './FormFieldSource';
import { LinkLists } from './LinkLists';
import {type MainResultJSON} from './Output'

import { setGetPath } from './sub/setGetPath';

import style from '@/styles/snapshot/Output.module.scss';


const MainResultOutput:React.FC<{
  selectedId:string,
  mainResultJSON:undefined|null|MainResultJSON,
  errorMessage:string,
}> = ({selectedId, mainResultJSON, errorMessage})=>{

  if(mainResultJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultJSON === null){
    return <>{errorMessage}</>
  }

  const getPath = setGetPath(selectedId);

  const { formData, version, targetURLs, links } = mainResultJSON;
  if( formData === undefined || version === undefined || targetURLs === undefined || links === undefined ){
    return (<><p>
      {getPath('__main.json')}のデータフォーマットが壊れているか、ファイルが存在しません。<br/>
      formData: {formData === undefined ? '未定義です' : '問題ありません'}<br/>
      version: {version === undefined ? '未定義です' : '問題ありません'}<br/>
      targetURLs: {targetURLs === undefined ? '未定義です' : '問題ありません'}<br/>
      links: {links === undefined ? '未定義です' : '問題ありません'}<br/>
    </p></>);
  }

  return (<>
    <p className={`${style.headingLv4} ${style['u-mt']}`}>メインの結果です。</p>
  <section>
    <h5 className={style.headingLv4}>URL</h5>
    <div className={style.table}>
      <TargetURLs {...{targetURLs, links, selectedId}} />
    </div>
    </section>
    <section>
    <h5 className={style.headingLv4}>FormData</h5>
    <div className={style.table}>
      <FormFieldSource {...{formData}} />
    </div>
    </section>
    <section>
    <h5 className={style.headingLv4}>リンクリスト</h5>
    <div className={style.table}>
      <LinkLists  {...{targetURLs, links}} />
    </div>
  </section>
  </>);
}


export default MainResultOutput;