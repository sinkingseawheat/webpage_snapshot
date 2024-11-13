import path from 'path';
import { useEffect } from 'react';

const ROOT_DIRECTORY = `/api/snapshot/sendFile`;

const MainResultOutput:React.FC<{
  selectedId:string
}> = ({selectedId})=>{
  const getPath = (relativePath:string)=>{
    return path.join(ROOT_DIRECTORY, selectedId.split('-').join('/') ,relativePath);
  }

  useEffect(()=>{
    (async ()=>{
      try{
        const response = await fetch(getPath('__main.json'));
        const json = await response.json();
        console.log(json);
      }catch(e){
        console.error(e);
      }
    })();
  },[]);

  return (<>
    mainResultです。
  </>);
}

export default MainResultOutput;