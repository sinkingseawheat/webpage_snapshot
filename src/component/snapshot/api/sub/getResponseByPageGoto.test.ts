import { chromium } from "playwright";
import { getResponseByPageGoto } from "./getResponseByPageGoto";

const stubHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>index</title>
</head>
<body>

</body>
</html>`;

const stubJSRedirectedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>js redirect</title>
  <script>
    location.href = '/index.html';
  </script>
</head>
<body>

</body>
</html>`;

const stubMetaRedirectedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>meta redirect</title>
  <meta http-equiv="refresh" content="0;url=/index.html" >
</head>
<body>

</body>
</html>`;

test('redirectTest',async ()=>{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console',(consoleMessage)=>{
    console.log(consoleMessage);
  })
  await page.route('**/*',(route)=>{
    const url = route.request().url();
    if(/js_redirect\.html$/.test(url)){
      route.fulfill({
        body:stubJSRedirectedHTML,
        status:200,
        headers:{
          'Content-Type':'test,html'
        }
      });
    }else if(/meta_redirect\.html$/.test(url)){
      route.fulfill({
        body:stubMetaRedirectedHTML,
        status:200,
        headers:{
          'Content-Type':'test,html'
        }
      });
    }else{
      route.fulfill({
        body:stubHTML,
        status:200,
        headers:{
          'Content-Type':'test,html'
        }
      });
    }
  });
  for await(const [url, type] of [
    ['https://example.com/js_redirect.html', 'js'],
    ['https://example.com/meta_redirect.html', 'meta'],
  ]){
    const {response, errorMessage, redirectInBrowser} = await getResponseByPageGoto(page, url);
    console.log(`${type} redirect\n${redirectInBrowser.join('\n').toString()}`);
  }

  await page.close();
  await browser.close();
})