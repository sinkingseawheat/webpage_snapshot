import path from 'path';
import { useEffect, useState } from 'react';

import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";
import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

import { getJSONData } from './sub/getJSONData';

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

  const [mainResultJSON, setMainResultJSON] = useState<undefined | null | MainResultJSON>(undefined);
  const [errorMessageOfMainResult, setErrorMessageOfMainResult] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      const {jsonData, errorMessage: errorMessageOfMainResult} = await getJSONData({selectedId, relativeJSONPath:'__main.json'});
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