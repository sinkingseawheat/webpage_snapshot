import dynamic from "next/dynamic";
import Output from "@/component/snapshot/Renderer/Output";
import PullDownOfJobId from "@/component/snapshot/Renderer/PullDownOfJobId";
import style from '@/component/snapshot/Renderer/style/FormInput.module.scss'

import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const InputForm = dynamic(import("@/component/snapshot/Renderer/InputForm"), {ssr: false});

const SnapShot:React.FC<{}> = ()=>{

  const [jobIds, setJobIds] = useState(['']);

  const router = useRouter();

  const [ymd, randomString ,_indexOfURL] = router.query.slug || [];

  const selectedId = (ymd ?? '') + '-' + (randomString ?? '');

  const indexOfURL = (()=>{
    if(/^\d{3}$/.test(_indexOfURL)){
      return _indexOfURL;
    }else if(/^\d{1,2}$/.test(_indexOfURL)){
      const parsed = parseInt(_indexOfURL);
      return parsed.toString().padStart(3,'0');
    }else{
      return _indexOfURL;
    }
  })();

  return (
    <section>
      <h2 className={style.headingLv1}>ウェブページの一括取得ツール</h2>
      {ymd === undefined ?
      <section>
        <h3 className={style.headingLv2}>入力欄</h3>
         <InputForm />
      </section>
        : ''}
      <section>
        <h3 className={style.headingLv2}>出力欄</h3>
      <div>
        <PullDownOfJobId {...{jobIds, setJobIds, selectedId}} />
      </div>
        {
        (!jobIds.includes(selectedId)) ?
          /* jobIdsの初回ロードが未完了の場合は何も表示しない */
          <>{(jobIds[0]==='' || selectedId === '-') ?
              ''
              : <p>存在しないIDが指定されました：{`${ymd}-${randomString}`}</p>
          }</>
          : <Output {...{selectedId, indexOfURL}} />
        }
      </section>
    </section>
  );
}

export default SnapShot;