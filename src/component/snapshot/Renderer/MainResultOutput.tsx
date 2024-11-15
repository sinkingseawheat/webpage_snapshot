import path from 'path';
import { useEffect, useState } from 'react';

import Link from 'next/link';

import { getResponseFormRequestURL } from './sub/getResponseFormRequestURL';

import style from '@/styles/snapshot/Output.module.scss';

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
        console.log(json)
        setMainResultJSON(json);
      }catch(e){
        console.error(e);
      }
    })();
  }, [selectedId]);


  return (<section>
    <h4>URL</h4>
    <div className={style.table}>
      {(new TargetURLs(mainResultJSON,{selectedId})).getPageSource()}
    </div>
    <h4>FormData</h4>
    <div className={style.table}>
      {(new FormFieldSource(mainResultJSON)).getPageSource()}
    </div>
    <div className={style.table}></div>
    <h4>リンクリスト</h4>
    <div className={style.table}>
      {(new LinkLists(mainResultJSON)).getPageSource()}
    </div>
  </section>);
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
      const response = getResponseFormRequestURL(links, url[1]);
      rowData.push(response['responseURL'] === url[1] ? '最初のリクエストと一致' : response['responseURL']); // responseURL
      rowData.push(response['status']); // status
      rowData.push(<Link href={`/snapshot/${option?.selectedId?.split('-').join('/')}/${url[0]}`}>ページ詳細へ</Link>);
      this.dataArray.push(rowData);
    });
  }
  public getPageSource = ()=>{
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

class FormFieldSource {
  public isValid:boolean = true;
  private dataArray:any[][]=[];
  constructor(mainResultJSON:any){
    const {formData} = mainResultJSON ?? {};
    if(formData === undefined){
      this.isValid = false;
      return;
    }
    for(const [key, value] of Object.entries(formData) ){
      this.dataArray.push([key, value]);
    }
  }
  public getPageSource(){
    if(!this.isValid){return '';}
    return (
      <table>
        <thead>
          <tr>
            <th>プロパティ</th>
            <th>値</th>
          </tr>
        </thead>
        <tbody>
        {this.dataArray.map((rowData)=>{
        return (<tr key={rowData[0]}>
          {rowData.map((cellData,index)=>{
            return (
              <td key={index}>{cellData}</td>
            )
          })}
        </tr>);
      })}
        </tbody>
      </table>
      );
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
      const linkSourceIndex:string[] = link['linkSourceIndex'];
      for(const IndexOfURL of this.tHeadData){
        rowData.push(linkSourceIndex.includes(IndexOfURL) ? '●' : '×');
      }
      this.dataArray.push(rowData);
    });
  }
  public getPageSource = ()=>{
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