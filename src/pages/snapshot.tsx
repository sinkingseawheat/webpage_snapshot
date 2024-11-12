import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import Output from "@/component/snapshot/Renderer/Output";

const InputForm = dynamic(import("@/component/snapshot/Renderer/InputForm"), {ssr: false});

const SnapShot:React.FC<{}> = ()=>{

  return (
    <section>
      <h2 className="p_header -lv2">ウェブページの一括取得ツール</h2>
      <section>
        <h3 className="p_header -lv3">入力欄</h3>
        <InputForm />
      </section>
      <section>
        <h3 className="p_header -lv3">出力欄</h3>
        <Output />
      </section>
    </section>
  );
}

export default SnapShot;