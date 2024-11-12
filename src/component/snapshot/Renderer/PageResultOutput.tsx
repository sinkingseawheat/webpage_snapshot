import path from "path";

const directoryStored = path.join(process.cwd(), './_data/result/snapshot');

const PageResultOutput:React.FC<{
  selectedId:string
}> = ()=>{
  return (<></>);
}


async function getResult(selectedId:string){
  const directoryRootPath = path.join(directoryStored, selectedId.split('-').join('/'));
}

export default PageResultOutput;