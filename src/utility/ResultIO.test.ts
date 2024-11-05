import { ResultIO } from "./ResultIO";

test('JSON書き込みテストです',async ()=>{
  const result = new ResultIO('YMD-abcd', 0, 'snapshotTest');
  await result.init();
  await result.writeJSON({
    firstRequested:{
      url:('urlです' as any),
      redirectCount: 1,
      redirectTransition: [{url:'a',status:200}],
    },
    scenarios:{
      test:'',
    }
  })
});