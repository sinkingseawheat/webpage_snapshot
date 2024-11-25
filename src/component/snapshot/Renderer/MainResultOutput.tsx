import Link from 'next/link';
import { TargetURLs } from './TargetURLs';
import { FormFieldSource } from './FormFieldSource';
import { LinkLists } from './LinkLists';
import { type MainResultRecordJSON } from '@/component/snapshot/JSON';

import { setGetPathToSendFile } from './sub/setGetPathToSendFile';

import style from '@/component/snapshot/Renderer/style/Output.module.scss';


const MainResultOutput:React.FC<{
  selectedId:string,
  mainResultRecordJSON:undefined|null|MainResultRecordJSON,
  errorMessageOfMainResult:string,
}> = ({selectedId, mainResultRecordJSON, errorMessageOfMainResult})=>{

  if(mainResultRecordJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultRecordJSON === null){
    return <>{errorMessageOfMainResult}</>
  }

  const getPath = setGetPathToSendFile(selectedId);

  const { formData, version, targetURLs, links } = mainResultRecordJSON;
  if( formData === undefined || version === undefined || targetURLs === undefined || links === undefined ){
    return (<><p>
      {getPath('main.json')}のデータフォーマットが壊れているか、ファイルが存在しません。<br/>
      formData: {formData === undefined ? '未定義です' : '問題ありません'}<br/>
      version: {version === undefined ? '未定義です' : '問題ありません'}<br/>
      targetURLs: {targetURLs === undefined ? '未定義です' : '問題ありません'}<br/>
      links: {links === undefined ? '未定義です' : '問題ありません'}<br/>
    </p></>);
  }

  return (<>
  <div className={style['u-mt']}><Link className={style.textLink} href="/snapshot/">&lt;入力画面に戻る</Link></div>
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
    <h5 className={style.headingLv4}>各ファイルのURLとそれらが使用されているページ</h5>
    <p>●が使われているページ、×が使われていないか検出できなかったページを表す</p>
    <div className={style.table}>
      <LinkLists  {...{targetURLs, links}} />
    </div>
  </section>
  </>);
}


export default MainResultOutput;