import style from '@/styles/snapshot/Output.module.scss';
import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

const LinkLists:React.FC<{
  targetURLs:[IndexOfURL, string][],
  links:any,
}> = ({targetURLs, links})=>{
  const tHeadData = targetURLs.map((url)=>url[0]);
  const dataArray = links.map((link:any)=>{
    const rowData:string[] = [];
    rowData.push(link['requestURL']); //requestURL
    const responseURL = link?.['response']?.['responseURL'] ?? '無し';
    rowData.push(responseURL===link['requestURL'] ? 'リクエストURLと一致' : responseURL); //responseURL
    const linkSourceIndex:string[] = link['linkSourceIndex'];
    for(const IndexOfURL of tHeadData){
      rowData.push(linkSourceIndex.includes(IndexOfURL) ? '●' : '×');
    }
    return rowData;
  });
  const getCellClassName = (index:number)=>{
    if(index===0 || index===1){
      return 'table__data--url'
    }else{
      return 'table__data--indexOfURL';
    }
  }
  return (
    <table>
      <thead>
        <tr>
          <th>最初にリクエストしたURL</th>
          <th>最後に受け取ったURL</th>
          {tHeadData.map((data) => (<th key={data} className={style['table__data--indexOfURL']}>{data}</th>))}
        </tr>
      </thead>
      <tbody>
        {dataArray.map((rowData:any[])=>{
          return (<tr key={rowData[0]}>
            {rowData.map((cellData,index)=>{
              return (
                <td key={index} className={style[getCellClassName(index)]}>{cellData}</td>
              )
            })}
          </tr>);
        })}
      </tbody>
  </table>);
}

export { LinkLists }