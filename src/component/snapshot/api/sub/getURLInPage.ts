import type { WrittenURLs } from '../Note';

/* ヘッドレスブラウザのみで実行可能。Node.jsのコンテキストでは実行不可 */

export const getURLInPage = ():WrittenURLs=>{
  function getURLsFromUrlMethod(cssText:string){
    const rv = cssText.match(/(?<=url\()[^)]+/g) ?? [];
    return rv.map(src=>src.replace(/["']/g,''));
  }
  // ▼ HeadlessBrowser Context
  const rv:WrittenURLs = [];
  // DOM_Attribute
  for(const node of document.querySelectorAll('[href], [src], [srcset], [action], picture, meta[property="og:image"], meta[name="twitter:image"]')){
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
      nullable.add(cur.getAttribute('content'));
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
      absURLs:[],
    });
  }
  function getURLsFromCSS(sheet:CSSStyleSheet){
    const rules = sheet.cssRules;
    const rvFromCSS:WrittenURLs = []
    for(const rule of rules){
      if(rule instanceof CSSStyleRule){
        if(rule.style.backgroundImage !== ''){
          const _relURL = getURLsFromUrlMethod(rule.style.backgroundImage);
          if(_relURL.length!==0){
            rvFromCSS.push({
              type: 'fromCascadingStyleSheets',
              href: rule.parentStyleSheet?.href ?? null,
              relURL: _relURL,
              absURLs:[],
            });
          }
        }else if(rule.style.background !== ''){
          const _relURL = getURLsFromUrlMethod(rule.style.background);
          // Todo:ショートハンドの場合でもbackgroundImageに反映されるか確認
          if(_relURL.length!==0){
            rvFromCSS.push({
              type: 'fromCascadingStyleSheets',
              href: rule.parentStyleSheet?.href ?? null,
              relURL: _relURL,
              absURLs:[],
            });
          }
        }
      }else if(rule instanceof CSSImportRule){
        if(rule.styleSheet!==null){
          for(const recursiveRv of getURLsFromCSS(rule.styleSheet)){
            rvFromCSS.push(recursiveRv);
          }
        }
      }
    }
    return rvFromCSS;
  }

  for(const sheet of document.styleSheets){
    for(const recursiveRv of getURLsFromCSS(sheet)){
      rv.push(recursiveRv);
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
        absURLs:[],
      });
    }
  }
  return rv;
  // ▲ HeadlessBrowser Context
};