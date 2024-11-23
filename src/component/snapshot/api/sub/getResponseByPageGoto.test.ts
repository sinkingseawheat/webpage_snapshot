import { Browser, chromium } from "playwright";
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



const stubInfiniteJSRedirectedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>meta redirect</title>
  <script>
    location.href='/infinite_redirect_loop.html';
  </script>
</head>
<body>

</body>
</html>`;

const getResponse = async(args:{
  url:string,
  htmlSrc:string,
  browser:Browser,
})=>{
  const { url, htmlSrc, browser } = args;
  const page = await browser.newPage();
  page.on('console',(consoleMessage)=>{
    console.log(consoleMessage);
  });
  page.route('**/*',(route)=>{
    if(route.request().url() === url){
      route.fulfill({
        body:htmlSrc,
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
  const response = await getResponseByPageGoto(page, url);
  await page.close();
  return response;
}


test('js', async ()=>{
  const browser = await chromium.launch();
  const {response, errorMessage, redirectInBrowser} = await getResponse({url:'https://example.com/js_redirect.html', htmlSrc:stubJSRedirectedHTML, browser});
  expect(errorMessage).toBe('');
  expect(redirectInBrowser).toEqual([
    'https://example.com/js_redirect.html','https://example.com/index.html'
  ]);
  await browser.close();
});
test('meta', async ()=>{
  const browser = await chromium.launch();
  const {response, errorMessage, redirectInBrowser} = await getResponse({url:'https://example.com/meta_redirect.html', htmlSrc:stubMetaRedirectedHTML, browser});
  expect(errorMessage).toBe('');
  expect(redirectInBrowser).toEqual([
    'https://example.com/meta_redirect.html','https://example.com/index.html'
  ]);
  await browser.close();
});
test('infinite loop', async ()=>{
  const browser = await chromium.launch();
  const {response, errorMessage, redirectInBrowser} = await getResponse({url:'https://example.com/infinite_redirect_loop.html', htmlSrc:stubInfiniteJSRedirectedHTML, browser});
  expect(errorMessage).toBe('[too many redirects]');
  await browser.close();
});