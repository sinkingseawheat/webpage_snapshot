import path from 'path';
import { readdir, mkdir, stat } from 'fs/promises';

import type { NextApiRequest, NextApiResponse } from "next";
import {VERSION} from '@/utility/getVersion';

export default async function handler(
  req:NextApiRequest,
  res:NextApiResponse<
  {
    type: 'jobId'
    jobIds: string[],
  } |{
    type: 'getVersion'
    version: string | null,
  } | {
    error: string
  }
  >
){
  if(req.method==='GET'){
    const {type} = req.query;
    switch(type){
      case 'jobIds':
        const jobIds = await getJobIds();
        res.status(200).json({
          type:'jobId',
          jobIds,
        });
        break;
      case 'getVersion':
        res.status(200).json({
          type:'getVersion',
          version:VERSION ?? null,
        })
        break;
      default:
        res.status(404).json({
          error: 'inValid type parameter'
        });
    }
  }else{
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

const DIRECTORY_STORING_RESULT = path.join(process.cwd(), './_data/result/snapshot');

async function getJobIds(){
  const rvWithBirthtime:[number, string][] = [];
  const rv:string[] = [];
  try{
    await mkdir(DIRECTORY_STORING_RESULT, {recursive:true});
    for (const dirent of await readdir(DIRECTORY_STORING_RESULT, {withFileTypes:true})){
      if(dirent.isDirectory() && /^\d{8}$/.test(dirent.name)){
        const parentPath = dirent.path || dirent.parentPath;
        for(const childDirent of await readdir(path.join(parentPath, dirent.name), {withFileTypes:true})){
          if(childDirent.isDirectory() && childDirent.name.length === 16){
            const stats = await stat(path.join(parentPath, dirent.name, childDirent.name));
            rvWithBirthtime.push([stats.birthtime.getTime(), `${dirent.name}-${childDirent.name}`]);
          }
        }
      }
    }
    rvWithBirthtime.sort((a,b) => b[0] - a[0]);
    rvWithBirthtime.forEach(([birthtime, jobId])=>{
      rv.push(jobId);
    })
  }catch(e){
    console.error(e);
  }finally{
    return rv;
  }
}

async function getresultRoot(){
  const rv:string[] = [];
  try{
    const directoryStoredResult = path.join(process.cwd(), './_data/result/snapshot');
    for (const dirent of await readdir(directoryStoredResult, {withFileTypes:true})){
      if(dirent.isDirectory() && /^\d{8}$/.test(dirent.name)){
        const parentPath = dirent.path || dirent.parentPath;
        for(const childDirent of await readdir(path.join(parentPath, dirent.name), {withFileTypes:true})){
          if(childDirent.isDirectory() && childDirent.name.length === 16){
            rv.push(`${dirent.name}-${childDirent.name}`);
          }
        }
      }
    }
  }catch(e){
    console.error(e);
  }finally{
    return rv;
  }
}