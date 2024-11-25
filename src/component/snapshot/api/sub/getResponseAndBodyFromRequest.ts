import { type Request } from "playwright";
import crypto from 'crypto';

async function getResponseAndBodyFromRequest(targetRequest:Request):Promise<{
  body:Buffer|null,
  response:{
    responseURL: string;
    status: number;
    contentType: string;
    contentLength: number;
    shaHash: string | null;
  }|null
}>{
  const _response = await targetRequest.response();
  const responseIncludeingBody:({
    responseURL: string;
    status: number;
    contentType: string;
    contentLength: number;
    shaHash: string | null;
    body: Buffer | null;
} | {
    responseURL: null;
    status?: number;
    contentType?: string;
    contentLength?: number;
    shaHash?: string | null;
    body: Buffer | null;
}) | null = await ( async ()=>{
    if(_response === null){return null;}
    const responseURL = _response.url();
    const status = _response.status();
    // statusが2xx以外はnullなど無効な値にする
    const isStatusOK = Math.floor(status/100) === 2;
    const responseHeaders = await _response.allHeaders();
    const contentType = isStatusOK ? responseHeaders['content-type'] : '';
    const contentLengthBeforeParse = responseHeaders['content-length'];
    const contentLength = (!isStatusOK || contentLengthBeforeParse === null) ? -1 : parseInt(contentLengthBeforeParse);
    const [shaHash, body] = await (async ()=>{
      try{
        if(isStatusOK === false){ return  [null, null] }
        const _body = await _response.body();
        const _shaHash = crypto.createHash('sha256').update(_body).digest('hex');
        return [_shaHash, _body];
      }catch(e){
        return [null, null];
      }
    })();
    return{
      responseURL,
      status,
      contentType,
      contentLength,
      shaHash,
      body
    }
  })();
  const [body, response] = (()=>{
    if(responseIncludeingBody === null){
      return [null, null]
    }
    const {body, ...response} = responseIncludeingBody;
    return [body, response];
  })();
  return {body, response}
}

export { getResponseAndBodyFromRequest };