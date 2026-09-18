const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const {dom,errors}=createCalculatorDom();
const w=dom.window,d=w.document,q=id=>d.getElementById('wm-'+id);
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}
function event(el,type){el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));}
function fill(id,value,type='input'){q(id).value=value;event(q(id),type);}
function submit(){event(q('form'),'submit');}
function mode(value){q('calendar-'+value).checked=true;event(q('calendar-'+value),'change');}
function select(id,value){
  // A native datalist writes its option value into the associated input.
  // Simulate that DOM event contract; this is not a browser popup test.
  const choice=[...q(id).list.options].find(o=>o.value===value);
  assert.ok(choice,'The requested choice exists in the native suggestion list');checks++;
  fill(id,choice.value);event(q(id),'change');
}
function typeDigits(id,text){
  const field=q(id);field.focus();field.value='';
  for(const digit of text){
    field.setRangeText(digit,field.selectionStart,field.selectionEnd,'end');
    field.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:digit}));
    if(field.value.length<text.length) eq(d.activeElement,field,'An unfinished two-digit entry keeps focus');
    eq(field.selectionStart,field.value.length,'Typing keeps the caret after the digit');
    eq(q('error').hidden,true,'No validation interruption during typing');
  }
  eq(field.value,text,'Digits are preserved without padding or clamping');
}
function invalid(id,value){
  fill(id,value);submit();eq(q('error').hidden,false,'Invalid '+id+' '+value+' is rejected');
  eq(q(id).getAttribute('aria-invalid'),'true');eq(q(id).value,value,'Validation preserves the entered value');
}

eq(errors,[]);
for(const id of ['month','day']){
  eq(q(id).tagName,'INPUT');eq(q(id).type,'text');eq(q(id).inputMode,'numeric');
  eq(q(id).hasAttribute('maxlength'),false,'Invalid long input is not silently truncated');
  eq(q(id).list.tagName,'DATALIST');eq(q(id+'-picker'),null,'No extra selector or confirmation control');
  eq(q(id).parentElement.querySelectorAll('input,select,button').length,1,'A single interactive field handles both methods');
}
eq([...d.querySelector('.manse-date').querySelectorAll('input,select,button')].map(el=>el.id),['wm-year','wm-month','wm-day'],'Date entry has exactly three native tab stops');
typeDigits('month','12');typeDigits('day','31');
for(const id of ['month','day']){
  q(id).focus();q(id).setSelectionRange(0,q(id).value.length);
  q(id).setRangeText('',q(id).selectionStart,q(id).selectionEnd,'end');
  q(id).dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
  eq(q(id).value,'');eq(d.activeElement,q(id));eq(q('error').hidden,true);
  const tab=new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});
  q(id).dispatchEvent(tab);eq(tab.defaultPrevented,false,'Native Tab behavior is not intercepted');
}

fill('year','2026');typeDigits('month','09');typeDigits('day','13');
fill('hour','12');fill('minute','00');fill('zone','korea','change');fill('clock','standard','change');fill('boundary','midnight','change');
const gender=d.querySelector('input[name="gender"]');gender.checked=true;event(gender,'change');
submit();eq(q('error').hidden,true);eq(q('summary').textContent,'양력 2026.09.13 · 12:00 · 남자');
const solarResult=q('variants').textContent;
select('month','10');eq(q('month').value,'10');eq(q('variants').children.length,0,'Picking a new date clears stale results');
select('day','31');submit();eq(q('error').hidden,true);eq(q('summary').textContent,'양력 2026.10.31 · 12:00 · 남자');
select('month','9');eq(q('day').value,'31','Month selection does not replace a typed day');
submit();eq(q('error').hidden,false,'September 31 is rejected');select('day','13');submit();eq(q('error').hidden,true);
eq(q('variants').textContent,solarResult,'Typing and mouse selection yield the same calculation');

for(const raw of ['','0','13','123','-1','1.5','1e1','０９']) invalid('month',raw);
fill('month','9');
for(const raw of ['','0','32','123','-1','1.5','1e1','３']) invalid('day',raw);
fill('month','4');invalid('day','31');
fill('month','2');invalid('day','29');fill('year','2024');submit();eq(q('error').hidden,true,'Leap-year February 29 is valid');
fill('year','2023');eq(q('day').value,'29');submit();eq(q('error').hidden,false,'Year edits validate instead of changing the birthday');

mode('lunar');eq(q('month').disabled,false);eq(q('day').disabled,false,'Lunar month and day can be typed before the year');
typeDigits('month','05');typeDigits('day','01');fill('year','2028');
q('intercalation').checked=true;event(q('intercalation'),'change');submit();eq(q('error').hidden,true);
eq(q('converted').textContent,'계산에 사용한 양력 2028.06.23');
const leapResult=q('variants').textContent;
q('intercalation').checked=false;event(q('intercalation'),'change');select('month','5');submit();eq(q('converted').textContent,'계산에 사용한 양력 2028.05.24');
q('intercalation').checked=true;event(q('intercalation'),'change');select('month','5');eq(q('month').value,'5');select('day','1');submit();
eq(q('variants').textContent,leapResult,'Typing plus leap selection matches the leap-month dropdown');
fill('month','05');fill('day','01');mode('solar');mode('lunar');
eq([q('year').value,q('month').value,q('day').value,q('intercalation').checked],['2028','05','01',true],'Calendar drafts retain typed text and leap status');
fill('year','2026');eq(q('intercalation').checked,true);submit();eq(q('error').hidden,false,'Unavailable leap month never silently becomes a regular month');
fill('year','2028');q('intercalation').checked=false;event(q('intercalation'),'change');fill('month','1');invalid('day','30');
fill('month','2');submit();eq(q('error').hidden,true,'Thirty-day lunar month accepts day 30');
fill('month','1');eq(q('day').value,'30');submit();eq(q('error').hidden,false,'Switching to a 29-day lunar month preserves and rejects day 30');

fill('month','2');fill('day','1');fill('hour','9');fill('minute','5');
q('unknown').checked=true;event(q('unknown'),'change');q('unknown').checked=false;event(q('unknown'),'change');
eq([q('hour').value,q('minute').value],['9','5'],'Time-entry drafts are unaffected');
eq(errors,[],'All interactions complete without runtime errors');
dom.window.close();
console.log(JSON.stringify({passed:checks,scope:'One field per date part, independent typing and datalist value entry, deletion, focus, date validity, lunar leap choice, drafts',browserRendered:false},null,2));
