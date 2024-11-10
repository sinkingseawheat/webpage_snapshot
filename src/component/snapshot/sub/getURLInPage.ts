import type { WrittenURLs } from '../Note';

export const getURLInPage = ():WrittenURLs=>{
  function getURLsFromUrlMethod(cssText:string){
    const rv = cssText.match(/(?<=url\()[^)]+/g) ?? [];
    return rv.map(src=>src.replace(/["']/g,''));
  }
  // ▼ HeadlessBrowser Context
  const rv:WrittenURLs = [];
  // DOM_Attribute
  for(const node of document.querySelectorAll('[href], [src], [srcset], [action], picture')){
    const tagName = node.tagName;
    if(tagName !== 'PICTURE' && node.closest('picture')){
      continue;
    }
    const targetNode = (()=>{
      if(tagName === 'PICTURE'){
        return Array.from(node.querySelectorAll('source, img'));
      }else{
        return [node];
      }
    })();
    const url = targetNode.reduce((acc, cur)=>{
      const nullable:Set<string|null> = new Set();
      nullable.add(cur.getAttribute('href'));
      nullable.add(cur.getAttribute('src'));
      nullable.add(cur.getAttribute('action'));
      const attrSrcset = cur.getAttribute('srcset');
      if(attrSrcset !== null){
        attrSrcset.split(',').forEach(src=>{
          const imgSrc = src.trim().split(/\s+/)[0];
          if(!/^\s*$/.test(imgSrc)){
            nullable.add(imgSrc);
          }
        })
      }
      for(const item of nullable){
        acc.add(item);
      }
      return acc;
    }, new Set<string|null>());
    rv.push({
      type:'DOM_Attribute',
      tagName,
      relURL: Array.from(url).filter((item)=>item!==null),
      absURL:[],
    });
  }
  // cssから取得。疑似要素へのcssもここで取得できるはず。要確認。
  for(const sheet of document.styleSheets){
    const rules = sheet.cssRules;
    for(const rule of rules){
      if(rule instanceof CSSStyleRule){
        if(rule.style.backgroundImage !== ''){
          rv.push({
            type: 'fromCascadingStyleSheets',
            href: rule.parentStyleSheet?.href ?? null,
            relURL: getURLsFromUrlMethod(rule.style.backgroundImage),
            absURL:[],
          });
        }else if(rule.style.background !== ''){
          // Todo:ショートハンドの場合でもbackgroundImageに反映されるか確認
          rv.push({
            type: 'fromCascadingStyleSheets',
            href: rule.parentStyleSheet?.href ?? null,
            relURL: getURLsFromUrlMethod(rule.style.background),
            absURL:[],
          });
        }
      }else if(rule instanceof CSSImportRule){
        if(rule.styleSheet!==null){
          const rules = rule.styleSheet.cssRules;
          for(const _rule of rules){
            // Todo:@import時の再帰呼び出し
          }
        }
      }
    }
  }
  // style属性から取得
  const allElm = document.querySelectorAll<HTMLElement>('*');
  for(const elm of allElm){
    const backgroundImage = elm?.style?.backgroundImage
    if(backgroundImage){
      rv.push({
        type:'styleAttribute',
        relURL: getURLsFromUrlMethod(backgroundImage),
        absURL:[],
      });
    }
  }
  return rv;
  // ▲ HeadlessBrowser Context
};