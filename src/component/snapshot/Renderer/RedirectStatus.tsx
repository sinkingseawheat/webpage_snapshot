import { MainResultRecordJSON } from "@/component/snapshot/JSON";
import { PageResultRecordJSON } from "@/component/snapshot/JSON";

import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";

const RedirectStatus:React.FC<{
  links: MainResultRecordJSON["links"],
  redirectTransition: PageResultRecordJSON["redirectTransition"]
}> = ({links, redirectTransition})=>{
  const {url, redirect} = redirectTransition;
  const response = getResponseFormRequestURL(links, url);
  const dataArray:{
    requestURL:string,
    status:number,
  }[] = []
  if(response === null){
    return (<>main.jsonに含まれていないURL{`${url}`}が指定されたため、処理を続行できません</>);
  }
  if(redirect === null){
    return (<>{`${url}`}は通信失敗したため結果を表示できません</>);
  }
  dataArray.push({
    requestURL:response?.responseURL || '',
    status:response?.status || 0,
  });
  for(const state of redirect.transition){
    dataArray.push({
      requestURL: state.url,
      status: state.status
    });
  }
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
        <tr key={rowData.requestURL}>
          <td>{rowData.requestURL}</td>
          <td>{rowData.status}</td>
        </tr>
      );
    })}
  </tbody>
  </table>);
}

export { RedirectStatus }