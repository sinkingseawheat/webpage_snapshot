import path from 'path';

export const setGetPathToSendFile = (selectedId:string)=>{
  const ROOT_DIRECTORY = `/api/snapshot/sendFile`
  const rootPath = path.join(ROOT_DIRECTORY, selectedId.split('-').join('/'));
  return (relativePath:string) => path.join(rootPath, relativePath);
};