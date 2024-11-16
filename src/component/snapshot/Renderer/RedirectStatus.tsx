import { MainResultJSON } from "@/utility/types/json";
import { PageResultJSON } from "@/utility/types/json";

import { getResponseFormRequestURL } from "./sub/getResponseFormRequestURL";

const RedirectStatus:React.FC<{
  links: MainResultJSON["links"],
  firstRequested: PageResultJSON["firstRequested"]
}> = ({links, firstRequested})=>{
  const {url, redirect} = firstRequested;
  const response = getResponseFormRequestURL(links, url);
  const dataArray:{
    requestURL:string,
    status:number,
  }[] = []
  if(response === null){
    return (<>__main.jsonに含まれていないURL{`${url}`}が指定されたため、処理を続行できません</>);
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