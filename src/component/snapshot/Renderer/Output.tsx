
import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

import Link from "next/link";

import { useState, useEffect } from "react";

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string
}> = ({selectedId, indexOfURL})=>{

  return (
    <>
        {
        /^\d{3}$/.test(indexOfURL) ?
        <PageResultOutput
          selectedId={selectedId}
          indexOfURL={indexOfURL}
        />
        :
        <MainResultOutput
          selectedId={selectedId}
        />
      }
    </>
  );
}

export default Output;