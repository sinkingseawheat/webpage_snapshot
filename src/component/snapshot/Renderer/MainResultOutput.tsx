import path from 'path';
import { useEffect, useState } from 'react';

import { TargetURLs } from './TargetURLs';
import { FormFieldSource } from './FormFieldSource';
import { LinkLists } from './LinkLists';
import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

import style from '@/styles/snapshot/Output.module.scss';

import { DOT_FILE_WHILE_PROCESSING } from '@/utility/Types';

type MainResultJSON = {
  formData:{[k:string]:any},
  version:string,
  targetURLs:[IndexOfURL, string][],
  links:any[],
}

const ROOT_DIRECTORY = `/api/snapshot/sendFile`;

const MainResultOutput:React.FC<{
  selectedId:string
}> = ({selectedId})=>{
  const getPath = (relativePath:string)=>{
    return path.join(ROOT_DIRECTORY, selectedId.split('-').join('/') ,relativePath);
  }
  const [mainResultJSON, setMainResultJSON] = useState<undefined|null|MainResultJSON>();

  let errorMessage = '';

  useEffect(()=>{
    (async ()=>{
      try{
        const response = await fetch(getPath('__main.json'));
        const json = await response.json();
        console.log(json)
        setMainResultJSON(json);
      }catch(e){
        console.error(e);
        const response = await fetch(getPath(DOT_FILE_WHILE_PROCESSING));
        if(response.status === 200){
          errorMessage = `${selectedId}はまだ処理中です。`;
        }else{
          errorMessage = `${getPath('__main.json')}の読み込みに失敗しました。データが壊れている可能性があります`
        }
        setMainResultJSON(null);
      }
    })();
  }, [selectedId]);

  if(mainResultJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultJSON === null){
    return <>{errorMessage}</>
  }

  const { formData, version, targetURLs, links } = mainResultJSON;
  if( formData === undefined || version === undefined || targetURLs === undefined || links === undefined ){
    return (<><p>
      {getPath('__main.json')}のデータフォーマットが壊れています<br/>
      formData: {formData === undefined ? '未定義です' : '問題ありません'}<br/>
      version: {version === undefined ? '未定義です' : '問題ありません'}<br/>
      targetURLs: {targetURLs === undefined ? '未定義です' : '問題ありません'}<br/>
      links: {links === undefined ? '未定義です' : '問題ありません'}<br/>
    </p></>);
  }

  return (<section>
    <h4>URL</h4>
    <div className={style.table}>
      <TargetURLs {...{targetURLs, links, selectedId}} />
    </div>
    <h4>FormData</h4>
    <div className={style.table}>
      <FormFieldSource {...{formData}} />
    </div>
    <h4>リンクリスト</h4>
    <div className={style.table}>
      <LinkLists  {...{targetURLs, links}} />
    </div>
  </section>);
}


export default MainResultOutput;