import { PageResultRecordJSON } from "@/component/snapshot/JSON";

const RedirectStatus:React.FC<{
  targetURL:string,
  redirectTransition: PageResultRecordJSON["redirectTransition"]
}> = ({targetURL,redirectTransition})=>{
  if(redirectTransition.length === 0){
    return (<>{`${targetURL}`}は結果を得られませんでした</>);
  }
  const dataArray = structuredClone(redirectTransition);
  // リダイレクトは最初のリクエストが上、最後のレスポンスが下に掲載させる
  dataArray.reverse();
  return (<>
  <table>
    <thead>
      <tr>
        <th>リクエストしたURL</th>
        <th>ステータス</th>
        <th>リダイレクトの要因</th>
        <th>リダイレクトの状態</th>
      </tr>
    </thead>
    <tbody>
      {dataArray.map((rowData, index, _self)=>{
        return (
          <tr key={rowData.url}>
            <td>{rowData.url}</td>
            <td>{rowData.status}</td>
            <td>{rowData.type}</td>
            <td>{_self.length-1 === index ? `最終的なURL` : `${index+1}回目のリクエスト`}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
  <p>Severリダイレクト→Browserリダイレクト→Serverリダイレクト…といった複雑なルートは記録できません</p>
  </>);
}

export { RedirectStatus }