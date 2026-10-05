const test=require('node:test');const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
test('web calculates a Gregorian 1500 birth, rejects unconfirmed timezone, and stores historical profile',()=>{
 const {dom,cleanup}=createCalculatorDom({url:'https://example.com'});const w=dom.window,d=w.document;
 const set=(id,v)=>{d.getElementById('wm-'+id).value=v;d.getElementById('wm-'+id).dispatchEvent(new w.Event('input',{bubbles:true}));};
 set('year','1500');set('month','10');set('day','10');d.querySelector('input[name=gender][value="남자"]').checked=true;
 d.getElementById('wm-unknown').checked=true;d.getElementById('wm-unknown').dispatchEvent(new w.Event('change',{bubbles:true}));
 const submit=()=>d.getElementById('wm-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 submit();assert.match(d.getElementById('wm-error').textContent,/UTC 시차/);
 set('zone','foreign');d.getElementById('wm-zone').dispatchEvent(new w.Event('change',{bubbles:true}));set('offset','0');submit();
 assert.ok(d.getElementById('wm-error').hidden);assert.match(d.getElementById('wm-summary').textContent,/1500.10.10/);
 assert.match(d.getElementById('wm-converted').textContent,/음력 변환 미지원/);
 set('name','역사 테스트');d.getElementById('wm-profile-save').click();
 assert.ok(Object.keys(w.localStorage).some(k=>k.startsWith('manse.profile.v1.')));
 set('year','1499');submit();assert.match(d.getElementById('wm-error').textContent,/1500/);
 cleanup();dom.window.close();
});
