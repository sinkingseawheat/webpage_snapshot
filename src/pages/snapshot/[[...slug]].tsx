import dynamic from "next/dynamic";
import Output from "@/component/snapshot/Renderer/Output";
import PullDownOfJobId from "@/component/snapshot/Renderer/PullDownOfJobId";

import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const InputForm = dynamic(import("@/component/snapshot/Renderer/InputForm"), {ssr: false});

const SnapShot:React.FC<{}> = ()=>{

  const [jobIds, setJobIds] = useState(['']);

  const router = useRouter();

  const [selectedId, _indexOfURL] = router.query.slug || [];

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
      <h2 className="p_header -lv2">ウェブページの一括取得ツール</h2>
      <section>
        <h3 className="p_header -lv3">入力欄</h3>
        <InputForm />
      </section>
      <section>
        <h3 className="p_header -lv3">出力欄</h3>
      <div>
        <PullDownOfJobId {...{jobIds, setJobIds}} />
      </div>
        {
        (!jobIds.includes(selectedId)) ?
          /* jobIdsの初回ロードが未完了の場合は何も表示しない */
          <>{(jobIds[0]==='' || selectedId === undefined) ?
              ''
              : <p>存在しないIDが指定されました：{`${selectedId}`}</p>
          }</>
          : <Output {...{selectedId, indexOfURL}} />
        }
      </section>
    </section>
  );
}

export default SnapShot;