import path from 'path';
import { useEffect, useState } from 'react';

import Link from 'next/link';

import style from '@/styles/snapshot/FormInput.module.scss';

const ROOT_DIRECTORY = `/api/snapshot/sendFile`;

const MainResultOutput:React.FC<{
  selectedId:string
}> = ({selectedId})=>{
  const getPath = (relativePath:string)=>{
    return path.join(ROOT_DIRECTORY, selectedId.split('-').join('/') ,relativePath);
  }

  const [mainResultJSON, setMainResultJSON] = useState(null);



  useEffect(()=>{
    (async ()=>{
      try{
        const response = await fetch(getPath('__main.json'));
        const json = await response.json();
        setMainResultJSON(json);
      }catch(e){
        console.error(e);
      }
    })();
  }, [selectedId]);


  return (<>
    <h2>URL</h2>
    <div className={style.table}>
        {(new TargetURLs(mainResultJSON,{selectedId})).getTable()}
    </div>
    <h2>FormData</h2>
    <div className={style.table}></div>
    <h2>リンクリスト</h2>
    <div className={style.table}>
      {(new LinkLists(mainResultJSON)).getTable()}
    </div>
  </>);
}

// Todo: 型定義は後で考える
class TargetURLs {
  public isValid:boolean = true;
  private dataArray:any[][]=[];
  constructor(mainResultJSON:any,option?:{[k:string]:any}){
    const targetURLs = mainResultJSON?.targetURLs;
    const links = mainResultJSON?.links;
    if(targetURLs === undefined || links === undefined){
      this.isValid = false;
      return;
    }
    targetURLs.forEach((url:any)=>{
      const rowData:any[] = []
      rowData.push(url[0]); // index
      rowData.push(url[1]); // requestURL
      for(const linkItem of links){
        if(linkItem.requestURL === url[1]){
          const {response} = linkItem;
          rowData.push(response['responseURL'] === url[1] ? '最初のリクエストと一致' : response['responseURL']); // responseURL
          rowData.push(response['status']); // status
        }
      }
      rowData.push(<Link href={`/snapshot/${option?.selectedId}/${url[0]}`}>ページ詳細へ</Link>);
      this.dataArray.push(rowData);
    });
  }
  public getTable = ()=>{
    if(!this.isValid){return '';}
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
      {this.dataArray.map((rowData)=>{
        return (<tr key={rowData[1]}>
          {rowData.map((cellData,index)=>{
            return (
              <td key={index} className={style[this.getCellClassName(index)]}>{cellData}</td>
            )
          })}
        </tr>);
      })}
    </tbody>
    </table>);
  }
  private getCellClassName(index:number){
    if(index===1 || index===2){
      return 'table__data--url'
    }else{
      return '';
    }
  }
}


// Todo: 型定義は後で考える
class LinkLists {
  public isValid:boolean = true;
  private dataArray:any[][]=[];
  private tHeadData:string[]=[];
  constructor(mainResultJSON:any){
    const listOfRequestURL:Map<string,string> = new Map();
    const targetURLs:[string,string] = mainResultJSON?.targetURLs;
    const links:any[] = mainResultJSON?.links;
    if(targetURLs === undefined || links === undefined){
      this.isValid = false;
      return;
    }
    targetURLs.forEach((targetURL)=>{
      listOfRequestURL.set(targetURL[1], targetURL[0]);
      this.tHeadData.push(targetURL[0]);
    });
    links.forEach((link:any)=>{
      const rowData:any[] = []
      rowData.push(link['requestURL']); //requestURL
      const responseURL = link?.['response']?.['responseURL'] ?? '無し';
      rowData.push(responseURL===link['requestURL'] ? 'リクエストURLと一致' : responseURL); //responseURL
      // const indexOfRequestURL = listOfRequestURL.get(link['requestURL']);
      const linkSourceIndex:string[] = link['linkSourceIndex'];
      for(const IndexOfURL of this.tHeadData){
        rowData.push(linkSourceIndex.includes(IndexOfURL) ? '●' : '×');
      }
      this.dataArray.push(rowData);
    });
  }
  public getTable = ()=>{
    if(!this.isValid){return '';}
    return (
      <table>
        <thead>
          <tr>
            <th>最初にリクエストしたURL</th>
            <th>最後に受け取ったURL</th>
            {this.tHeadData.map((data) => (<th key={data} className={style['table__data--indexOfURL']}>{data}</th>))}
          </tr>
        </thead>
        <tbody>
          {this.dataArray.map((rowData:any[])=>{
            return (<tr key={rowData[0]}>
              {rowData.map((cellData,index)=>{
                return (
                  <td key={index} className={style[this.getCellClassName(index)]}>{cellData}</td>
                )
              })}
            </tr>);
          })}
        </tbody>
    </table>);
  }
  private getCellClassName(index:number){
    if(index===0 || index===1){
      return 'table__data--url'
    }else{
      return 'table__data--indexOfURL';
    }
  }
}

export default MainResultOutput;