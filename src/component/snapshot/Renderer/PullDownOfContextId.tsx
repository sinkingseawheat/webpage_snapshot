import { Dispatch, SetStateAction } from "react";

const PullDownOfContextId:React.FC<{
  contextIds:string[],
  setContextIds:Dispatch<SetStateAction<string[]>>,
  selectedId:string,
  setSelected:Dispatch<SetStateAction<string>>
}> = ({contextIds, setContextIds, selectedId, setSelected})=>{

  return (
    <>
      <select
        onChange={(e)=>{
          setSelected(e.target.value);
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