import style from '@/component/snapshot/Renderer/style/Output.module.scss';
import { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/router";

import { useEffect } from "react";

const PullDownOfJobId:React.FC<{jobIds:string[], setJobIds:Dispatch<SetStateAction<string[]>>, selectedId:string}> = ({jobIds, setJobIds, selectedId})=>{

  useEffect(()=>{
    handlePulldownClick(setJobIds)
  }, []);

  const router = useRouter();
  return (
    <section>
      <h4 className={`${style.headingLv3} ${style['u-mt']}`}>選択されたjobId</h4>
      <select className={style.jobIdSelect}
        value={selectedId}
        onChange={(e)=>{
          const jobId = e.target.value;
          if(jobId !== ''){
            router.push(`/snapshot/${e.target.value.split('-').join('/')}`);
          }
        }}
        onClick={(e)=>{
          handlePulldownClick(setJobIds);
        }}
        onKeyDown={(e)=>{
          if(e.code === 'Enter'){
            handlePulldownClick(setJobIds);
          }
        }}
      >
        <option value=''>選択してください</option>
        {jobIds.map((jobId)=>{
          return (<option key={jobId} value={jobId}>{jobId}</option>);
        })}
      </select>
    </section>
  )
}

function handlePulldownClick(setJobIds:Dispatch<SetStateAction<string[]>>){
  (async ()=>{
    const response = await fetch('/api/snapshot/info?type=jobIds');
    if(response.status!==200){return;}
    const json = await response.json();
    const jobIds:string[] = json["jobIds"];
    setJobIds(jobIds);
  })();
}

export default PullDownOfJobId;