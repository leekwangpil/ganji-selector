const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const {dom,errors}=createCalculatorDom();
const w=dom.window,d=w.document,q=id=>d.getElementById('wm-'+id);
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}
function event(el,type){el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));}
function fill(id,value){q(id).value=value;event(q(id),'input');}
function focusIs(id,label){eq(d.activeElement,q(id),label);}
function mode(value){q('calendar-'+value).checked=true;event(q('calendar-'+value),'change');}
function reset(calendar='solar'){
  q('submit').focus();mode(calendar);
  q('unknown').checked=false;event(q('unknown'),'change');
  q('intercalation').checked=false;event(q('intercalation'),'change');
  for(const id of ['year','month','day','hour','minute'])fill(id,'');
}
function insert(text,inputType='insertText',isComposing=false){
  const el=d.activeElement;
  el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');
  el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType,data:text,isComposing}));
}
function typeStream(text){for(const digit of text)insert(digit);}
function replace(id,text,inputType='insertFromPaste'){
  q(id).focus();q(id).select();insert(text,inputType);
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));

(async()=>{
  eq(errors,[]);reset();q('year').focus();
  const expectedFocus=['year','year','year','month','month','day','day','hour','hour','minute','minute','minute'];
  [...'199009151425'].forEach((digit,index)=>{insert(digit);focusIs(expectedFocus[index],'Continuous typing advances at the correct digit');});
  eq(['year','month','day','hour','minute'].map(id=>q(id).value),['1990','09','15','14','25']);
  eq(q('variants').children.length,0,'Finishing minutes never submits the form automatically');
  for(const [id,value] of [['zone','korea'],['clock','standard'],['boundary','midnight']]){q(id).value=value;event(q(id),'change');}
  const gender=d.querySelector('input[name="gender"]');gender.checked=true;event(gender,'change');
  event(q('form'),'submit');eq(q('error').hidden,true);eq(q('summary').textContent,'양력 1990.09.15 · 14:25 · 남자');

  reset();q('year').focus();typeStream('200099905');
  eq(['year','month','day','hour','minute'].map(id=>q(id).value),['2000','9','9','09','05'],'Unambiguous single digits also advance');focusIs('minute');
  reset();replace('year','2000');replace('month','1','insertText');focusIs('month','Month 1 can still become 10, 11 or 12');
  insert('2');focusIs('day');insert('3');focusIs('day','Day 3 can still become 30 or 31');insert('1');focusIs('hour');
  insert('2');focusIs('hour','Hour 2 can still become 20 through 23');insert('3');focusIs('minute');
  replace('hour','00');focusIs('minute','Midnight is a valid complete hour');

  for(const [id,text] of [['year','1900'],['year','2051'],['year','19900101'],['month','00'],['month','13'],['month','1e1'],['day','00'],['day','32'],['hour','24'],['hour','-1']]){
    replace(id,text);focusIs(id,'Invalid or overlong values do not advance');eq(q(id).value,text,'No silent truncation');
  }
  reset();fill('year','2023');fill('month','2');replace('day','29');focusIs('day','A non-leap-year February 29 stays editable');
  fill('year','2024');replace('day','29');focusIs('hour','A real leap day advances');
  fill('month','4');replace('day','31');focusIs('day','April 31 cannot advance');

  reset();fill('year','2000');fill('month','12');q('month').focus();q('month').setSelectionRange(1,2);
  q('month').setRangeText('',1,2,'end');event(q('month'),'beforeinput');
  q('month').dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
  focusIs('month','Deleting a digit never advances');eq(q('month').value,'1');insert('2');focusIs('day');
  q('month').focus();q('month').setSelectionRange(0,1);insert('0');
  focusIs('month','Editing the start of an existing value keeps the caret');eq(q('month').value,'02');
  q('month').select();insert('03');focusIs('day','Replacing the complete value advances');
  q('month').focus();q('month').select();insert('09','historyUndo');focusIs('month','Undo does not advance');

  // Native list event contracts, simulated in the DOM; no browser popup is opened.
  reset();fill('year','2000');replace('month','1','insertReplacementText');focusIs('day','A selected one-digit month is complete');
  replace('day','1','insertReplacementText');focusIs('hour','A selected one-digit day is complete');
  q('month').focus();fill('month','1');event(q('month'),'change');await tick();focusIs('day','Browsers emitting generic input and change also advance after selection');
  q('month').focus();fill('month','1');event(q('month'),'change');q('year').focus();await tick();focusIs('year','A blur-triggered change cannot steal the user’s chosen focus');
  q('month').focus();fill('month','1');event(q('month'),'change');q('month').select();insert('0');await tick();focusIs('month','A newer edit cancels a queued commit');
  const tab=new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true});q('month').dispatchEvent(tab);eq(tab.defaultPrevented,false,'Native reverse tab navigation remains available');

  reset();q('year').focus();event(q('year'),'compositionstart');insert('1990','insertCompositionText',true);focusIs('year','IME composition never moves focus');
  event(q('year'),'compositionend');await tick();focusIs('month','Completed numeric composition advances once');
  q('year').focus();q('year').select();event(q('year'),'compositionstart');insert('2000','insertCompositionText',true);
  event(q('year'),'compositionend');q('minute').focus();await tick();focusIs('minute','A delayed composition completion cannot steal focus');

  reset('lunar');fill('year','2028');fill('month','1');replace('day','30');focusIs('day','A 29-day lunar month rejects day 30');
  fill('month','2');replace('day','30');focusIs('hour','A 30-day lunar month accepts day 30');
  q('intercalation').checked=true;event(q('intercalation'),'change');replace('month','05');focusIs('day','A real leap month advances');
  replace('day','01');focusIs('hour');fill('year','2026');replace('month','05');focusIs('month','A nonexistent leap month does not advance');

  reset();fill('year','2000');fill('month','1');q('unknown').checked=true;event(q('unknown'),'change');replace('day','01');
  focusIs('day','Unknown time never focuses disabled hour or minute inputs');eq(q('hour').disabled,true);eq(q('minute').disabled,true);
  await tick();eq(errors,[]);
  dom.window.close();console.log(JSON.stringify({passed:checks,scope:'Sequential entry, partial digits, list commits, invalid dates, edits, IME, unknown time, no automatic submission',browserRendered:false},null,2));
})().catch(error=>{dom.window.close();console.error(error);process.exitCode=1;});
