import path from 'path';
import { useEffect, useState } from 'react';

import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

import { getJSONData } from './sub/getJSONData';
import { MainResultJSON } from '@/component/snapshot/JSON';

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string,
}> = ({selectedId, indexOfURL})=>{

  const [mainResultJSON, setMainResultJSON] = useState<undefined | null | MainResultJSON>(undefined);
  const [errorMessageOfMainResult, setErrorMessageOfMainResult] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const {jsonData, errorMessage: errorMessageOfMainResult} = await getJSONData({selectedId, relativeJSONPath:'main.json'});
      setMainResultJSON(jsonData)
      setErrorMessageOfMainResult(errorMessageOfMainResult)
    })()
  }, [selectedId]);

  return (
    <>
      {
        /^\d{3}$/.test(indexOfURL) ?
        <PageResultOutput {...{selectedId, indexOfURL, mainResultJSON, errorMessageOfMainResult}}/>
        :
        <MainResultOutput
        {...{selectedId, indexOfURL, mainResultJSON, errorMessageOfMainResult}}
        />
      }
    </>
  );
}

export default Output;