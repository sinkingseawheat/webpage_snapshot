import path from 'path';
import { useEffect, useState } from 'react';

import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

import { getJSONData } from './sub/getJSONData';
import { MainResultRecordJSON, isMainResultRecordJSON } from '@/component/snapshot/JSON';

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string,
}> = ({selectedId, indexOfURL})=>{

  const [mainResultRecordJSON, setMainResultRecordJSON] = useState<undefined | null | MainResultRecordJSON>(undefined);
  const [errorMessageOfMainResult, setErrorMessageOfMainResult] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const {jsonData, errorMessage: errorMessageOfMainResult} = await getJSONData({selectedId, relativeJSONPath:'main.json'});
      if(isMainResultRecordJSON(jsonData)){
        setMainResultRecordJSON(jsonData)
        setErrorMessageOfMainResult(errorMessageOfMainResult)
      }
    })()
  }, [selectedId]);

  return (
    <>
      {
        /^\d{3}$/.test(indexOfURL) ?
        <PageResultOutput {...{selectedId, indexOfURL, mainResultRecordJSON, errorMessageOfMainResult}}/>
        :
        <MainResultOutput
        {...{selectedId, indexOfURL, mainResultRecordJSON, errorMessageOfMainResult}}
        />
      }
    </>
  );
}

export default Output;