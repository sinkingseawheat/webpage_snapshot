import { MainResultRecordJSON } from "@/component/snapshot/JSON";
import { PageResultRecordJSON } from "@/component/snapshot/JSON";

const RedirectStatus:React.FC<{
  targetURL:string,
  redirectTransition: PageResultRecordJSON["redirectTransition"]
}> = ({targetURL,redirectTransition})=>{
  if(redirectTransition.length === 0){
    return (<>{`${targetURL}`}は通信を失敗したため結果を表示できません</>);
  }
  const dataArray = structuredClone(redirectTransition);
  // リダイレクトは最初のリクエストが上、最後のレスポンスが下に掲載させる
  dataArray.reverse();
  return (<table>
    <thead>
      <tr>
        <th>リクエストしたURL</th>
        <th>ステータス</th>
      </tr>
    </thead>
    <tbody>
    {dataArray.map((rowData)=>{
      return (
        <tr key={rowData.url}>
          <td>{rowData.url}</td>
          <td>{rowData.status}</td>
        </tr>
      );
    })}
  </tbody>
  </table>);
}

export { RedirectStatus }