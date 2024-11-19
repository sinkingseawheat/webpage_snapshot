import path from 'path';
import { useEffect, useState } from 'react';

import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

import { getJSONData } from './sub/getJSONData';
import { MainResultRecordJSON } from '@/component/snapshot/JSON';

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string,
}> = ({selectedId, indexOfURL})=>{

  const [mainResultJSON, setMainResultRecordJSON] = useState<undefined | null | MainResultRecordJSON>(undefined);
  const [errorMessageOfMainResult, setErrorMessageOfMainResult] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const {jsonData, errorMessage: errorMessageOfMainResult} = await getJSONData({selectedId, relativeJSONPath:'main.json'});
      setMainResultRecordJSON(jsonData)
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