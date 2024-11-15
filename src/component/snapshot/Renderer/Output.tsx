import path from 'path';
import { useEffect, useState } from 'react';

import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";
import { DOT_FILE_WHILE_PROCESSING } from '@/utility/Types';
import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

import { setGetPath } from './sub/setGetPath';

export type MainResultJSON = {
  formData:{[k:string]:any},
  version:string,
  targetURLs:[IndexOfURL, string][],
  links:any[],
}

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string,
}> = ({selectedId, indexOfURL})=>{
  const getPath = setGetPath(selectedId);
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

  return (
    <>
      {
        /^\d{3}$/.test(indexOfURL) ?
        <PageResultOutput {...{selectedId, indexOfURL, mainResultJSON}}/>
        :
        <MainResultOutput
        {...{selectedId, indexOfURL, mainResultJSON, errorMessage}}
        />
      }
    </>
  );
}

export default Output;