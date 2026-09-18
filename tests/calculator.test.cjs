const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const library=require('lunar-javascript');
const {createManseEngine}=require('../src/lib/manse/engine.js');
const {createCalendarAdapter}=require('../src/lib/manse/calendar-adapter.js');
const tz=require('../src/lib/manse/timezone.json');
const engine=createManseEngine(library,tz,createCalendarAdapter(require('korean-lunar-calendar')));
const base={year:2026,month:9,day:13,hour:12,minute:0,unknown:false,zone:'korea',clock:'standard',boundary:'zi23',gender:'남자'};
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}
function calc(extra={}){return engine.calculate({...base,...extra});}
function first(extra={}){return calc(extra).variants[0];}
function textPillars(p){return [p.year.ko,p.month.ko,p.day.ko,p.hour?.ko||null];}
function reject(extra,part){assert.throws(()=>calc(extra),part);checks++;}

// Independent KASI calendar day facts, read at https://astro.kasi.re.kr/life/pageView/5.
// Only the DAY field is compared: the page's lunar month is not a saju month pillar.
const kasiDays=['무인','기묘','경진','신사','임오','계미','갑신','을유','병술','정해','무자','기축','경인','신묘','임진','계사','갑오','을미','병신','정유','무술','기해','경자','신축','임인','계묘','갑진','을사','병오','정미'];
kasiDays.forEach((day,n)=>eq(first({day:n+1}).day.ko,day,'KASI September 2026 day '+(n+1)));
eq(textPillars(first()),['병오','정유','경인','임오']);
eq(first().natural,'경술');
eq(first({gender:'여자'}).natural,'경신');
eq(textPillars(first({hour:22,minute:59})),['병오','정유','경인','정해']);
eq(textPillars(first({hour:23,minute:0})),['병오','정유','신묘','무자']);
eq(textPillars(first({hour:23,minute:0,boundary:'split'})),['병오','정유','경인','무자']);
eq(textPillars(first({hour:23,minute:0,boundary:'midnight'})),['병오','정유','경인','병자']);
eq(textPillars(first({day:14,hour:0,minute:0})),['병오','정유','신묘','무자']);
eq(first({clock:'meridian',hour:23,minute:29}).day.ko,'경인');
eq(first({clock:'meridian',hour:23,minute:30}).day.ko,'신묘');
eq(first({clock:'meridian',hour:1,minute:29}).hour.ji,'자');
eq(first({clock:'meridian',hour:1,minute:30}).hour.ji,'축');
eq(first({clock:'longitude',longitude:127.5}).correctedWall,first({clock:'meridian'}).correctedWall);
eq(calc({unknown:true,boundary:'zi23'}).variants.map(v=>[v.day.ko,v.hour]),[['경인',null],['신묘',null]]);
eq(calc({unknown:true,boundary:'midnight'}).variants.map(v=>[v.day.ko,v.hour]),[['경인',null]]);
eq(first({year:1988,month:7,day:1}).correction,-60,'Summer clock is one hour ahead of standard');
eq(first({year:1988,month:7,day:1,clock:'meridian'}).correction,-90,'DST and longitude correction are combined once');
eq(first({year:1954,month:4,day:1,clock:'meridian'}).correction,0,'Historical UTC+08:30 must not lose another 30 min');
eq(first({year:1955,month:6,day:1,clock:'meridian'}).correction,-60);
eq(first({year:1911,month:6,day:1,clock:'meridian'}).correction,0);
eq(first({year:1912,month:6,day:1,clock:'meridian'}).correction,-30);
reject({year:1987,month:5,day:10,hour:2,minute:30},/존재하지 않는/);
reject({year:1988,month:5,day:8,hour:2,minute:30},/존재하지 않는/);
reject({year:1961,month:8,day:10,hour:0,minute:15},/존재하지 않는/);
reject({year:1912,month:1,day:1,hour:0,minute:15},/존재하지 않는/);
eq(calc({year:1988,month:10,day:9,hour:2,minute:0,clock:'meridian'}).duplicate,true);
eq(calc({year:1988,month:10,day:9,hour:2,minute:0,clock:'meridian'}).variants.length,2);
reject({year:2023,month:2,day:29},/올바른 양력/);
reject({year:2100},/1910/);reject({year:1909},/1910/);
eq(first({year:2000,month:2,day:29}).day.ko,library.Solar.fromYmd(2000,2,29).getLunar().getDayInGanZhi().split('').map(c=>({'甲':'갑','乙':'을','丙':'병','丁':'정','戊':'무','己':'기','庚':'경','辛':'신','壬':'임','癸':'계','子':'자','丑':'축','寅':'인','卯':'묘','辰':'진','巳':'사','午':'오','未':'미','申':'신','酉':'유','戌':'술','亥':'해'})[c]).join(''));
reject({hour:24},/0~23/);reject({minute:60},/0~59/);reject({hour:NaN},/0~23/);
reject({zone:''},/시간대/);reject({clock:''},/시간 기준/);reject({boundary:''},/날짜 변경/);
eq(first({zone:'foreign',offset:9,dst:false}).year.han,first().year.han);
eq(first({zone:'foreign',offset:-5,dst:true}).correction,-60);
reject({zone:'foreign',offset:15},/UTC/);
reject({clock:'longitude',longitude:181},/경도/);

// Cross-check all 12 month boundaries in representative historical regimes and endpoints.
// These verify our timezone and pillar arithmetic against the upstream API; they do not
// independently certify upstream ephemerides or Wonkwang compatibility.
for(const year of [1910,1948,1954,1961,1987,1988,2000,2024,2026,2050]) {
  for(const term of engine.termsFor(year).filter(t=>new Date(t.utc+8*3600000).getUTCFullYear()===year)) {
    for(const delta of [-1,0,1]) {
      const utc=term.utc+delta;
      const p=engine.atInstant(utc,base);
      const fields=engine.fields(utc+8*3600000);
      const lunar=library.Solar.fromYmdHms(...fields).getLunar();
      eq(p.year.han,lunar.getYearInGanZhiExact(),`year at ${year} ${term.label} ${delta}`);
      eq(p.month.han,lunar.getMonthInGanZhiExact(),`month at ${year} ${term.label} ${delta}`);
    }
  }
}
const spring=engine.termsFor(2026).find(t=>t.name==='立春');
eq(engine.atInstant(spring.utc-1,base).year.ko,'을사');
eq(engine.atInstant(spring.utc,base).year.ko,'병오');
eq(engine.atInstant(spring.utc-1,base).month.ko,'기축');
eq(engine.atInstant(spring.utc,base).month.ko,'경인');
const springFields=engine.fields(spring.utc+9*3600000);
eq(calc({year:springFields[0],month:springFields[1],day:springFields[2],hour:springFields[3],minute:springFields[4]}).variants.length,2,'Minute containing solar term does not invent seconds');
eq(calc({month:2,day:4,unknown:true,boundary:'midnight'}).variants.length,2,'Unknown time on Lichun leaves year/month alternatives');

// Independent solar-term samples: KASI 2028 calendar data (provisional, published
// to whole minutes), https://astro.kasi.re.kr/kor/life/post/calendarData.
// This is a sample comparison, not full-range validation or a Wonkwang comparison.
const kasiTerms2028=[['소한',1,6,4,55],['입춘',2,4,16,31],['경칩',3,5,10,25],['청명',4,4,15,3],['입하',5,5,8,12],['망종',6,5,12,16],['소서',7,6,22,30],['입추',8,7,8,21],['백로',9,7,11,22],['한로',10,8,3,9]];
for(const [label,month,day,hour,minute] of kasiTerms2028) {
  const term=engine.termsFor(2028).find(t=>t.label===label && new Date(t.utc+9*3600000).getUTCFullYear()===2028);
  const expected=Date.UTC(2028,month-1,day,hour,minute)-9*3600000;
  assert.ok(Math.abs(term.utc-expected)<=30000,'KASI rounded minute: '+label);checks++;
}

// Actual production React markup and controller in a DOM runtime; no browser or network requests are used.
const {dom,errors}=createCalculatorDom();
const win=dom.window,doc=win.document;
const q=id=>doc.getElementById('wm-'+id);
const event=(el,type)=>el.dispatchEvent(new win.Event(type,{bubbles:true,cancelable:true}));
function fill(id,value,type='input') {q(id).value=value;event(q(id),type);}
function submit(){event(q('form'),'submit');}
eq(errors,[],'Calculator starts with no runtime errors');
eq(q('month').list.options.length,12);eq(q('day').list.options.length,31);
const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);eq(new Set(ids).size,ids.length);
for(const label of doc.querySelectorAll('label[for]')) {assert.ok(doc.getElementById(label.htmlFor));checks++;}
fill('year','2026');fill('month','9','change');fill('day','13','change');
fill('hour','9');fill('minute','0');
eq(q('hour').value,'9','Typing does not force padding');event(q('hour'),'blur');eq(q('hour').value,'09');
fill('hour','23');fill('minute','59');
const male=doc.querySelector('input[name="gender"][value="남자"]');male.checked=true;event(male,'change');
eq(q('zone').value,'korea','User-approved default timezone');
eq(q('clock').value,'standard','User-approved default correction');
eq(q('boundary').value,'zi23','User-approved default day boundary');
submit();eq(q('error').hidden,true,'Calculate with the selected defaults');
eq(q('variants').querySelectorAll('.manse-pillar').length,4);assert.match(q('variants').textContent,/辛/);checks++;
fill('hour','00');eq(q('variants').children.length,0,'Stale pillars disappear immediately');
fill('minute','00');submit();eq(q('error').hidden,true,'00:00 is valid');
fill('hour','24');submit();eq(q('error').hidden,false);eq(doc.activeElement,q('hour'));
fill('hour','1e1');submit();eq(q('error').hidden,false);
fill('hour','2');fill('minute','60');submit();eq(q('error').hidden,false);
fill('minute','');submit();eq(q('error').hidden,false,'Empty minute is not midnight');
fill('minute','25');q('unknown').checked=true;event(q('unknown'),'change');
eq(q('hour').disabled,true);eq(q('hour').value,'');eq(q('minute').value,'');
submit();eq(q('error').hidden,true);assert.match(q('variants').textContent,/미정/);checks++;
q('unknown').checked=false;event(q('unknown'),'change');eq(q('hour').value,'02');eq(q('minute').value,'25');
fill('year','2024');event(q('year'),'blur');fill('month','2','change');fill('day','29','change');
eq(q('day').value,'29');fill('year','2023');event(q('year'),'blur');eq(q('day').value,'29','A typed leap day is preserved until validation, never clamped');
submit();eq(q('error').hidden,false,'Invalid February 29 is rejected on calculation');eq(doc.activeElement,q('day'));
fill('zone','foreign','change');eq(q('foreign-fields').hidden,false);eq(q('offset').disabled,false);
fill('zone','korea','change');eq(q('foreign-fields').hidden,true);eq(q('offset').disabled,true);
fill('clock','longitude','change');eq(q('longitude').disabled,false);fill('clock','standard','change');eq(q('longitude').disabled,true);
eq(errors,[],'No interaction runtime errors');
dom.window.close();
console.log(JSON.stringify({passed:checks,scope:'KASI day samples, timezone transitions, term boundaries, day/hour conventions, emitted HTML DOM interactions',browserRendered:false,wonkwangCompared:false},null,2));
