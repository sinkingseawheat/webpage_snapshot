import { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/router";

import { useEffect } from "react";

const PullDownOfContextId:React.FC<{contextIds:string[], setContextIds:Dispatch<SetStateAction<string[]>>}> = ({contextIds, setContextIds})=>{

  useEffect(()=>{
    handlePulldownClick(setContextIds)
  }, []);

  const router = useRouter();

  return (
    <>
      <select
        onChange={(e)=>{
          const contextId = e.target.value;
          if(contextId !== ''){
            router.push(`/snapshot/${e.target.value}`);
          }
        }}
        onClick={(e)=>{
          handlePulldownClick(setContextIds);
        }}
        onKeyDown={(e)=>{
          if(e.code === 'Enter'){
            handlePulldownClick(setContextIds);
          }
        }}
      >
        <option value=''>選択してください</option>
        {contextIds.map((contextId)=>{
          return (<option key={contextId} value={contextId}>{contextId}</option>);
        })}
      </select>
    </>
  )
}

function handlePulldownClick(setContextIds:Dispatch<SetStateAction<string[]>>){
  (async ()=>{
    const response = await fetch('/api/snapshot/info?type=contextIds');
    if(response.status!==200){return;}
    const json = await response.json();
    const contextIds:string[] = json["contextIds"];
    setContextIds(contextIds);
  })();
}

export default PullDownOfContextId;