import { setGetPathToSendFile } from './setGetPathToSendFile';
import { DOT_FILE_WHILE_PROCESSING } from '@/utility/Types';

/* Todo: JSONデータの型をナローイング */
export const getJSONData = async (args:{
  selectedId:string,
  relativeJSONPath:string
}):Promise<{
  jsonData:any|null,
  errorMessage:string
}> => {
  const { selectedId, relativeJSONPath } = args;
  const getPath = setGetPathToSendFile(selectedId);
  let jsonData = null;
  let errorMessage = '';
  try{
    const responseOfIsRunning = await fetch(getPath(DOT_FILE_WHILE_PROCESSING));
    if(responseOfIsRunning.ok){
      errorMessage = `Not Finished:${selectedId}はまだ処理中です。もしくは異常終了したため結果が得られませんでした`;
    }else{
      const response = await fetch(getPath(relativeJSONPath));
      if(response.ok){
        jsonData = await response.json();
        console.log(jsonData)
      }else{
        if(response.status === 404){
          errorMessage = `Not Found:${getPath(relativeJSONPath)}の読み込みに失敗しました。ファイルが存在しません`;
        }else{
          errorMessage = `Not Found:${getPath(relativeJSONPath)}の読み込みに失敗しました。原因は不明です status:${response.status}`;
        }
      }
    }
  }catch(e){
    errorMessage = `Something Wrong:${getPath(relativeJSONPath)}へのFetch時にエラーが発生しました。原因は不明です。`
  }finally{
    return {
      jsonData,
      errorMessage
    }
  }
}