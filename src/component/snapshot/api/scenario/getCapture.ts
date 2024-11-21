import type { Page } from "playwright";

export const getCapture = async (page:Page)=>{
  const option:Parameters<Page["screenshot"]>[0] = {
    fullPage:true,
    animations:'disabled',
    quality: 50, // 高クオリティのキャプチャは不要
    scale: 'css', // 精細なRetinaのキャプチャは不要
    type: 'jpeg',
  }
  const rv:{name:string, buffer: Buffer}[] = [];

  await page.emulateMedia({'colorScheme':'light'});
  const screenshotBufferLight = await page.screenshot(option);
  rv.push({
    name: 'capture_fullpageColorSchemeIsLight.jpg',
    buffer: screenshotBufferLight,
  });

  await page.emulateMedia({'colorScheme':'dark'});
  const screenshotBufferDark = await page.screenshot(option);
  rv.push({
    name: 'capture_fullpageColorSchemeIsDark.jpg',
    buffer: screenshotBufferDark,
  });

  // colorSchemeを元に戻す
  await page.emulateMedia({colorScheme:null});
  return rv;
}