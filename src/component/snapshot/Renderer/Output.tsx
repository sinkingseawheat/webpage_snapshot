import PullDownOfContextId from "./PullDownOfContextId";
import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

import { useState, useEffect } from "react";

const Output:React.FC<{}> = ()=>{

  const [contextIds, setContextIds] = useState(['']);
  const [selectedId, setSelected] = useState('');

  const propContextIds = {
    contextIds,
    setContextIds,
    selectedId,
    setSelected,
  }

  /* Todo: MainResultOutputとPageResultOutputは、contextIdsの更新時は再レンダリングを抑止する */

  return (
    <>
      <div>
        <PullDownOfContextId
          {...propContextIds}
        />
      </div>
      <div>
        <MainResultOutput
          selectedId={selectedId}
        />
      </div>
      <div>
        <PageResultOutput
          selectedId={selectedId}
        />
      </div>
    </>
  );
}

export default Output;