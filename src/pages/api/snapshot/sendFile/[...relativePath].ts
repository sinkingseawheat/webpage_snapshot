import path from "path";
import { readdir, stat, readFile } from "fs/promises";


import type { NextApiRequest, NextApiResponse } from "next";

const DIRECTORY_STORING_RESULT = path.join(process.cwd(), './_data/result/snapshot');

export default async function handler(
  req:NextApiRequest,
  res:NextApiResponse<
  Buffer |
  {
    message:string,
  }
  >
){
  if(req.method==='GET'){
    try{
      const _relativePath = req.query.relativePath;
      if(_relativePath === undefined || typeof _relativePath === 'string'){
        throw new Error(`${req.query.relativePath}は文字列の配列でなければいけません`)
      }
      const relativePath = path.join(_relativePath.join('/'));
      const absolutePath = path.join(DIRECTORY_STORING_RESULT, relativePath);
      const fileState = await stat(absolutePath);
      if(!fileState.isDirectory()){
        const buffer = await readFile(absolutePath,{encoding:null});
        res.status(200).end(buffer);
        return;
      }
    }catch(e){
      console.error(e);
      res.status(404).end({message:`Can't Get File`});
    }
  }else{
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      message: 'Method Not Allowed'
    });
  }
}
