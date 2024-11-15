import { getResponseFormRequestURL } from './sub/getResponseFormRequestURL';
import style from '@/styles/snapshot/Output.module.scss';
import Link from 'next/link';
import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

const TargetURLs:React.FC<{
  targetURLs:any,
  links:any,
  selectedId:string,
}> = ({targetURLs, links, selectedId})=>{
  const dataArray:{
    index: IndexOfURL,
    requestURL: string,
    responseURL: string|null,
    status: number|null,
    linkHref: string
  }[] = [];
  targetURLs.forEach((url:[IndexOfURL, string])=>{
    const response = getResponseFormRequestURL(links, url[1]);
    if(response === null){
      console.error(`mainResutl['links']に${url[1]}のデータがありません`);
      return; // 何もせずに次のurlに移動
    }
    dataArray.push({
      index: url[0],
      requestURL: url[1],
      responseURL: response['responseURL'] === url[1] ? '最初のリクエストと一致' : response['responseURL'],
      status: response["status"] ?? null,
      linkHref: `/snapshot/${selectedId.split('-').join('/')}/${url[0]}`,
    });
  });
  return (<table>
    <thead>
      <tr>
        <th>番号</th>
        <th className={style['table__data--url']}>最初にリクエストしたURL</th>
        <th className={style['table__data--url']}>最後に受け取ったURL</th>
        <th>レスポンスステータス</th>
        <th>ページ詳細を見るリンク</th>
      </tr>
    </thead>
    <tbody>
    {dataArray.map((rowData)=>{
      const {index, requestURL, responseURL, status, linkHref} = rowData;
      return (<tr key={requestURL}>
        <td>{index}</td>
        <td className={style['table__data--url']}>{requestURL}</td>
        <td className={style['table__data--url']}>{responseURL}</td>
        <td>{status}</td>
        <td><Link href={linkHref}>ページ詳細へ</Link></td>
      </tr>);
    })}
  </tbody>
  </table>);
}

export { TargetURLs }