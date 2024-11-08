import { readFileSync } from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

import type { BrowserContextOptions } from 'playwright';

const JSON_PATH = path.join(process.cwd(), './_data/.networkSetting.json');

type Proxy = BrowserContextOptions["proxy"];

const isObject = (x:any):x is Object=>{
  return Object(x) === x;
}

class SettingError extends Error{
  static {
    this.prototype.name = 'SettingError';
  }
}

class Setting {
  private data!:{
    proxy: Proxy|null,
    basicAuth:Map<RegExp,{
      username:string,
      password:string
    }>|null,
    allowArchive: RegExp[],
  };
  constructor(){
    this.setData();
  }
  private setData():void{
    // アプリ起動時とupdate()の実行時のみしか走らないので、同期関数で十分
    try{
      const json = (()=>{
        const source = readFileSync(JSON_PATH, { encoding: 'utf8' });
        const _json = JSON.parse(source);
        return _json;
      })();
      const proxy:typeof this.data["proxy"] = (()=>{
        if('proxy' in json
            && 'server' in json["proxy"]
            && typeof json["proxy"]["server"] === 'string'
            && json["proxy"]["server"] !== ''){
          console.log('proxyが設定されました');
          console.log(json['proxy']);
          return json['proxy'];
        }else{
          console.log('proxyは無効となりました')
          return null;
        }
      })();
      const basicAuth:typeof this.data["basicAuth"] = (()=>{
        if('basicAuth' in json){
          const basicAuth = new Map<RegExp,{username:string,password:string}>();
          for(const [server, auth] of Object.entries(json["basicAuth"])){
            try{
              const regServer = new RegExp(server);
              if(isObject(auth)
                && 'username' in auth && typeof auth.username === 'string'
                && 'password' in auth && typeof auth.password === 'string'){
                  const _username = auth.username;
                  const _password = auth.password;
                  basicAuth.set(regServer, {
                    username: _username,
                    password: _password,
                  });
              }
            }catch(e){
              console.log(`${server}に対するBasic認証の設定に失敗しました`);
            }
          }
          return basicAuth;
        }else{
          return null;
        }
      })();
      const allowArchive: typeof this.data["allowArchive"] = (()=>{
        if('allowArchive' in json &&
          Array.isArray(json["allowArchive"]) &&
          json["allowArchive"].every((origin)=>typeof origin === 'string')
        ){
          return json["allowArchive"].map((origin)=>new RegExp(origin));
        }else{
          console.log(`allowArchiveの設定に失敗したためアーカイブの設定はされません`)
          return [];
        }
      })();
      this.data = {
        proxy,
        basicAuth,
        allowArchive,
      }
    }catch(e){
      if((e as any).code === 'ENOENT'){
        console.log(`${JSON_PATH}が存在しません。proxyとBasic認証、アーカイブの設定はされません`)
      }
      this.data = {
        proxy: null,
        basicAuth: null,
        allowArchive: [],
      }
    }
  }

  update(){
    this.setData();
  }

  getProxy():Proxy|null{
    const {proxy} = this.data
    if(proxy){
      return proxy;
    }else{
      return null;
    }
  }

  getBasicAuthorization(url:string):{Authorization:string}|null{
    if(this.data.basicAuth === null){
      return null;
    }
    for(const [regExp, auth] of this.data.basicAuth.entries()){
      if(regExp.test(url)){
        return { Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}` };
      }
    }
    // ヒットなしの場合もnullを返す
    return null;
  }

}

const setting = new Setting();

export { setting }