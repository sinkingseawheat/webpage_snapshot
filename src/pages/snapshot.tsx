import dynamic from "next/dynamic";

const Renderer = dynamic(import("@/component/snapshot/renderer"), {ssr: false});

const SnapShot:React.FC<{}> = ()=>{
  return (
    <section>
      <h2 className="p_header -lv2">ウェブページの一括取得ツール</h2>
      <section>
        <h3 className="p_header -lv3">入力欄</h3>
        <Renderer />
      </section>
      <section>
        <h3 className="p_header -lv3">出力欄</h3>
      </section>
    </section>
  );
}

export default SnapShot;