import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../assets/js/analytics.js',import.meta.url),'utf8');
test('GA4 loads only on the HTTPS production hosts',()=>{
  for(const [url,expected] of [
    ['https://roomjurmala.lv/',true],
    ['https://www.roomjurmala.lv/en/',true],
    ['http://roomjurmala.lv/',false],
    ['http://127.0.0.1:4174/',false],
    ['https://room-jurmala-updates.tails-888.chatgpt.site/',false],
    ['https://roomjurmala.lv.example.com/',false],
  ]){
    const scripts=[],window={};
    vm.runInNewContext(code,{location:new URL(url),window,document:{createElement:()=>({}),head:{append:s=>scripts.push(s)}}});
    assert.equal(scripts.length,expected?1:0,url);
    if(expected){
      assert.equal(scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-QLD7392ML2');
      assert.equal(window.dataLayer[1][0],'config');
      assert.equal(window.dataLayer[1][1],'G-QLD7392ML2');
    }else assert.equal(window.dataLayer,undefined);
  }
});
