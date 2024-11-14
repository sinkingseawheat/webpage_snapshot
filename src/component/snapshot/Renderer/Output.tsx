
import MainResultOutput from "./MainResultOutput";
import PageResultOutput from "./PageResultOutput";

const Output:React.FC<{
  selectedId:string,
  indexOfURL:string
}> = ({selectedId, indexOfURL})=>{

  return (
    <>
        {
        /^\d{3}$/.test(indexOfURL) ?
        <PageResultOutput
          selectedId={selectedId}
          indexOfURL={indexOfURL}
        />
        :
        <MainResultOutput
          selectedId={selectedId}
        />
      }
    </>
  );
}

export default Output;