import type { NextApiRequest, NextApiResponse } from "next";

import { entrance } from "@/component/headlessBrowser/entrance";

import type { ResponseData } from "@/component/headlessBrowser/FormData";

export default async function handler(
  req:NextApiRequest,
  res:NextApiResponse<ResponseData>
){
  if(req.method==='GET'){
    res.status(200).json({
      status:'OK',
      id:'',
      validURLs:[],
      message:'正常に受信しました',
    });
  }else if(req.method==='POST'){
    try{
      const deserializedBody = JSON.parse(req.body);
      const responseData = await entrance.request(deserializedBody, 'snapshot');
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(responseData));
    }catch(e){
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        status:'NG',
        message:'無効なパラメータが送信されました',
      }));
    }
  }else{
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status:'NG',
      message:'GET/POSTのみ許可されています',
    }));
  }
}