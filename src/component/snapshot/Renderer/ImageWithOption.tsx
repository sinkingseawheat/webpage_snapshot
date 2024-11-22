import { useState, useEffect } from 'react';
import style from '@/component/snapshot/Renderer/style/Output.module.scss'
import { setGetPathToSendFile } from './sub/setGetPathToSendFile';

const ImageWithOption:React.FC<{archiveIndex:number, query:string, getPath:ReturnType<typeof setGetPathToSendFile>}> = ({archiveIndex, query, getPath})=>{

  const [width, setWidth] = useState<number|null>(null);
  const [height, setHeight] = useState<number|null>(null);
  const [BGC, setBGC] = useState<''|'rgb(var(--foreground-rgb))'>('');
  return (
    <>
      <div className={style.imageItem__preview} style={{backgroundColor: BGC}}>
        <img src={getPath(`archive/${archiveIndex}?${query}`)} alt="" onLoad={(e)=>{
          const {naturalWidth, naturalHeight} = e.currentTarget;
          setWidth(naturalWidth);
          setHeight(naturalHeight);
        }} />
      </div>
      <div>
      <p>width:{width ?? 'ロード中'}, height:{height ?? 'ロード中'}</p>
      <button onClick={(e)=>{
        setBGC(prevState=>{
          if(prevState === ''){
            return `rgb(var(--foreground-rgb))`;
          }else{
            return ``;
          }
        })
      }}>背景色切り替え</button>
      </div>
    </>
  );
}

export { ImageWithOption }