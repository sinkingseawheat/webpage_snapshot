import { setGetPathToSendFile } from './setGetPathToSendFile';
import { DOT_FILE_PROCESS_COMPLETED } from '@/utility/types/types';
import { isMainResultRecordJSON, isPageResultRecordJSON, MainResultRecordJSON, PageResultRecord } from '../../JSON';

export const getJSONData = async (args:{
  selectedId:string,
  relativeJSONPath:string
}):Promise<{
  jsonData:any,
  errorMessage:string
}> => {
  const { selectedId, relativeJSONPath } = args;
  const getPath = setGetPathToSendFile(selectedId);
  let jsonData = null;
  let errorMessage = '';
  try{
    // Todo:JSONをFetchするごとにリクエストが発生してしまうので、キャッシュ機構を持たせる。
    const responseOfHasFinished = await fetch(getPath(DOT_FILE_PROCESS_COMPLETED));
    if(responseOfHasFinished.ok){
      const response = await fetch(getPath(relativeJSONPath));
      if(response.ok){
        jsonData = await response.json();
      }else{
        if(response.status === 404){
          errorMessage = `Not Found:${getPath(relativeJSONPath)}の読み込みに失敗しました。ファイルが存在しません`;
        }else{
          errorMessage = `Not Found:${getPath(relativeJSONPath)}の読み込みに失敗しました。原因は不明です status:${response.status}`;
        }
      }
    }else{
      errorMessage = `Not Finished:${selectedId}はまだ処理中です。もしくは異常終了したため結果が得られませんでした`;
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