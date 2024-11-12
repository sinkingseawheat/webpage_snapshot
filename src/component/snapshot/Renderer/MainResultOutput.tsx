import path from 'path';

const directoryStored = path.join(process.cwd(), './_data/result/snapshot');

const MainResultOutput:React.FC<{
  selectedId:string
}> = ({selectedId})=>{
  return (<>
  </>);
}

async function getResult(selectedId:string){
  const directoryRootPath = path.join(directoryStored, selectedId.split('-').join('/'));
}

export default MainResultOutput;