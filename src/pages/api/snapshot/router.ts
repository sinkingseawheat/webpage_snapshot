import type { NextApiRequest, NextApiResponse } from "next";

import { entrance } from "@/component/snapshot/api/entrance";

import type { ResponseData } from "@/component/snapshot/FormData";

export default async function handler(
  req:NextApiRequest,
  res:NextApiResponse<ResponseData>
){
  if(req.method==='GET'){
    res.status(200).json({
      id:'',
      validURLs:[],
      message:'正常に受信しました',
    });
  }else if(req.method==='POST'){
    try{
      const deserializedBody = JSON.parse(req.body);
      const responseData = await entrance.request(deserializedBody);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(responseData));
    }catch(e){
      console.error(e);
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        message:'無効なパラメータが送信されました',
      }));
    }
  }else{
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      message: 'Method Not Allowed'
    });
  }
}