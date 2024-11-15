import { type IndexOfURL, isIndexOfURL } from '@/utility/Types';

const FormFieldSource:React.FC<{mainResultJSON:any}> = ({mainResultJSON})=>{
  const formData:{[k:string]:string} = mainResultJSON?.formData;
  if(formData === undefined){
    return undefined;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>プロパティ</th>
          <th>値</th>
        </tr>
      </thead>
      <tbody>
      {Array.from(Object.entries(formData)).map(([key, value])=>{
        return (<tr key={key}>
          <td>{key}</td><td>{value}</td>
        </tr>);
      })}
      </tbody>
    </table>
    );
}

class bk_FormFieldSource {
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

export { FormFieldSource }