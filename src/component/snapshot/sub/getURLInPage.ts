import type { RelativeURLs } from '../Note';

export const getURLInPage = ():RelativeURLs=>{
  // ▼ HeadlessBrowser Context
  const rv:RelativeURLs = [];
  // DOM_Attribute
  for(const node of document.querySelectorAll('[href], [src], [srcset], [action], picture')){
    if(node.closest('picture')){
      continue;
    }
    const tagName = node.tagName;
    const targetNode = (()=>{
      if(tagName === 'PICTURE'){
        return Array.from(node.querySelectorAll('source, img'));
      }else{
        return [node];
      }
    })();
    const url = targetNode.reduce((acc)=>{
      const nullable:Set<string|null> = new Set();
      nullable.add(node.getAttribute('href'));
      nullable.add(node.getAttribute('src'));
      nullable.add(node.getAttribute('srcset'));
      nullable.add(node.getAttribute('action'));
      for(const item of nullable){
        acc.add(item);
      }
      return acc;
    }, new Set<string|null>());
    rv.push({
      type:'DOM_Attribute',
      tagName,
      url: Array.from(url).filter((item)=>item!==null),
    });
  }
  // cssから取得
  for(const sheet of document.styleSheets){
    const rules = sheet.cssRules;
    for(const rule of rules){
      if(rule instanceof CSSPageRule){
        // rule.selectorText
        if(rule.style.backgroundImage !== ''){
          rv.push({
            type: 'fromCascadingStyleSheets',
            href: rule.parentStyleSheet?.href ?? null,
            url: [rule.style.backgroundImage]
          });
        }
      }
    }
  }
  return rv;
  // ▲ HeadlessBrowser Context
};