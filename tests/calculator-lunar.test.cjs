const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const {createCalendarAdapter}=require('../src/lib/manse/calendar-adapter.js');
const {createManseEngine}=require('../src/lib/manse/engine.js');
const adapter=createCalendarAdapter(require('korean-lunar-calendar'));
const engine=createManseEngine(require('lunar-javascript'),require('../src/lib/manse/timezone.json'),adapter);
const base={calendar:'solar',year:2026,month:9,day:13,hour:12,minute:0,unknown:false,zone:'korea',clock:'standard',boundary:'midnight',gender:'남자'};
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}
function lunar(year,month,day,intercalation=false){return {...base,calendar:'lunar',year,month,day,intercalation};}
const pillars=r=>r.variants.map(v=>[v.year.han,v.month.han,v.day.han,v.hour?.han||null,v.natural]);

// Independent published examples, not converter-derived expectations.
// Maintainer README: 2017-06-24 = lunar leap 5/1; lunar 1956-1-21 = 1956-03-03.
// https://github.com/usingsky/korean_lunar_calendar_js
eq(adapter.resolveDate(lunar(2017,5,1,true)).solar,{year:2017,month:6,day:24});
eq(adapter.resolveDate(lunar(1956,1,21)).solar,{year:1956,month:3,day:3});
// KASI monthly table September 2026: https://astro.kasi.re.kr/life/pageView/5
for(let day=1;day<=30;day++) {
  const expected={year:2026,month:day<=10?7:8,day:day<=10?day+19:day-10,intercalation:false};
  eq(adapter.resolveDate({...base,day}).lunar,expected);
  eq(adapter.resolveDate(lunar(expected.year,expected.month,expected.day)).solar,{year:2026,month:9,day});
}
// KASI 2028 calendar data (provisional). https://astro.kasi.re.kr/kor/life/post/calendarData
const fixtures=[
  [1,false,1,27],[2,false,2,25],[3,false,3,26],[4,false,4,25],
  [5,false,5,24],[5,true,6,23],[6,false,7,22],[7,false,8,20],
  [8,false,9,19],[9,false,10,18],[10,false,11,16],[11,false,12,16]
];
for(const [lunarMonth,leap,month,day] of fixtures) {
  const input=lunar(2028,lunarMonth,1,leap);
  const r=engine.calculate(input);
  eq(r.dates.solar,{year:2028,month,day});
  eq(pillars(r),pillars(engine.calculate({...base,year:2028,month,day})),'Equivalent lunar/solar input must yield the same full saju');
}
eq(adapter.resolveDate(lunar(1909,11,20)).solar,{year:1910,month:1,day:1});
eq(adapter.resolveDate(lunar(2050,11,18)).solar,{year:2050,month:12,day:31});
eq(engine.calculate(lunar(1909,11,20)).input.calendar,'solar','Normalized input calendar matches its dates');
for(const input of [lunar(1909,11,19),lunar(2050,11,19),lunar(2050,12,1),lunar(2028,1,30),lunar(2026,5,1,true),lunar(2025,6,31,true)]) {
  assert.throws(()=>adapter.resolveDate(input));checks++;
}
eq(adapter.lunarMonths(2028).find(m=>m.value==='1').days.length,29);
eq(adapter.lunarMonths(2028).find(m=>m.value==='2').days.length,30);
eq(adapter.lunarMonths(2028).filter(m=>m.intercalation).map(m=>m.value),['L5']);
eq(adapter.lunarMonths(2026).filter(m=>m.intercalation),[]);
eq(adapter.lunarMonths(1909)[0].days[0],20);
eq(adapter.lunarMonths(2050).at(-1).days.at(-1),18);
const reference=engine.calculate({...base,unknown:true});
eq(pillars(engine.calculate({...lunar(2026,8,3),unknown:true})),pillars(reference));
// A failed lookup must not reuse a prior successful date from the stateful vendor.
adapter.resolveDate(lunar(2017,5,1,true));assert.throws(()=>adapter.resolveDate(lunar(2017,3,1,true)));checks++;

const {dom,errors}=createCalculatorDom();
const w=dom.window,d=w.document,q=id=>d.getElementById('wm-'+id);
const event=(el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
function fill(id,value,type='input'){q(id).value=value;event(q(id),type);}
function mode(value){q('calendar-'+value).checked=true;event(q('calendar-'+value),'change');}
function submit(){event(q('form'),'submit');}
eq(errors,[]);
fill('year','2026');fill('month','9','change');fill('day','13','change');
fill('hour','12');fill('minute','00');fill('zone','korea','change');fill('clock','standard','change');fill('boundary','midnight','change');
d.querySelector('input[name="gender"]').checked=true;submit();eq(q('error').hidden,true);
const solarResult=q('variants').textContent;
eq(q('converted').textContent,'한국 음력 2026.08.03 (평달)');
mode('lunar');eq(q('variants').children.length,0);eq(q('converted').hidden,true);
eq(q('year').value,'','Calendar modes use separate drafts');eq(q('month').disabled,false);eq(q('month').list.options.length,0);
fill('year','2026');eq(q('month').list.options.length,12);
fill('month','8','change');fill('day','3','change');submit();eq(q('error').hidden,true);
eq(q('variants').textContent,solarResult);eq(q('converted').textContent,'계산에 사용한 양력 2026.09.13');
assert.match(q('summary').textContent,/음력 2026.08.03 \(평달\)/);checks++;
fill('year','2028');eq(q('month').list.options.length,12);
fill('month','1','change');eq(q('day').list.options.length,29,'29-day lunar month');
fill('month','2','change');eq(q('day').list.options.length,30,'30-day lunar month');
q('intercalation').checked=true;event(q('intercalation'),'change');eq([...q('month').list.options].map(o=>o.value),['5']);
fill('month','5','change');fill('day','1','change');submit();eq(q('error').hidden,true);
assert.match(q('summary').textContent,/음력 2028.05.01 \(윤달\)/);checks++;
eq(q('converted').textContent,'계산에 사용한 양력 2028.06.23');
mode('solar');eq([q('year').value,q('month').value,q('day').value],['2026','9','13']);
eq(q('hour').value,'12');eq(q('minute').value,'00');
mode('lunar');eq([q('year').value,q('month').value,q('day').value],['2028','5','1']);eq(q('intercalation').checked,true);
fill('year','2026');eq(q('month').value,'5','A typed lunar date is preserved, never silently converted into a regular month');eq(q('day').value,'1');eq(q('intercalation').checked,true);eq(q('day').list.options.length,0);
submit();eq(q('error').hidden,false,'A nonexistent leap month is rejected');
fill('year','2050');q('intercalation').checked=false;event(q('intercalation'),'change');eq([...q('month').list.options].some(o=>o.value==='12'),false);
fill('month','11','change');eq([...q('day').list.options].at(-1).value,'18');
fill('day','18','change');submit();eq(q('error').hidden,true);eq(q('converted').textContent,'계산에 사용한 양력 2050.12.31');
eq(errors,[]);dom.window.close();
console.log(JSON.stringify({passed:checks,scope:'Korean lunar conversion, real leap-month choices, month lengths, solar/lunar saju equivalence, date drafts and bounds',browserRendered:false,wonkwangCompared:false},null,2));
