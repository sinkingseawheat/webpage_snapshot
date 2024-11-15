import path from 'path';
import { useEffect, useState } from 'react';

import { TargetURLs } from './TargetURLs';
import { FormFieldSource } from './FormFieldSource';

import style from '@/styles/snapshot/Output.module.scss';

import { DOT_FILE_WHILE_PROCESSING } from '@/utility/Types';

type MainResultJSON = {
  formData:{[k:string]:any},
  version:string,
  targetURLs:any[],
  links:any[],
}

const ROOT_DIRECTORY = `/api/snapshot/sendFile`;

const MainResultOutput:React.FC<{
  selectedId:string
}> = ({selectedId})=>{
  const getPath = (relativePath:string)=>{
    return path.join(ROOT_DIRECTORY, selectedId.split('-').join('/') ,relativePath);
  }
  const [mainResultJSON, setMainResultJSON] = useState<undefined|null|MainResultJSON>();

  let errorMessage = '';

  useEffect(()=>{
    (async ()=>{
      try{
        const response = await fetch(getPath('__main.json'));
        const json = await response.json();
        console.log(json)
        setMainResultJSON(json);
      }catch(e){
        console.error(e);
        const response = await fetch(getPath(DOT_FILE_WHILE_PROCESSING));
        if(response.status === 200){
          errorMessage = `${selectedId}はまだ処理中です。`;
        }else{
          errorMessage = `${getPath('__main.json')}の読み込みに失敗しました。データが壊れている可能性があります`
        }
        setMainResultJSON(null);
      }
    })();
  }, [selectedId]);

  if(mainResultJSON === undefined){
    return <>ロード中です</>;
  }

  if(mainResultJSON === null){
    return <>{errorMessage}</>
  }

  const { formData, version, targetURLs, links } = mainResultJSON;
  if( formData === undefined || version === undefined || targetURLs === undefined || links === undefined ){
    return (<><p>
      {getPath('__main.json')}のデータフォーマットが壊れています<br/>
      formData: {formData === undefined ? '未定義です' : '問題ありません'}<br/>
      version: {version === undefined ? '未定義です' : '問題ありません'}<br/>
      targetURLs: {targetURLs === undefined ? '未定義です' : '問題ありません'}<br/>
      links: {links === undefined ? '未定義です' : '問題ありません'}<br/>
    </p></>);
  }

  return (<section>
    <h4>URL</h4>
    <div className={style.table}>
      <TargetURLs {...{targetURLs, links,selectedId}} />
    </div>
    <h4>FormData</h4>
    <div className={style.table}>
      <FormFieldSource {...{formData}} />
    </div>
    <h4>リンクリスト</h4>
    <div className={style.table}>
      {(new LinkLists(mainResultJSON)).getPageSource()}
    </div>
  </section>);
}

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