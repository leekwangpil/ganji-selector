const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const {buildNaturalCycleCases}=require('../src/lib/manse/natural-cycles.js');
const lunarLibrary=require('lunar-javascript');
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}

const cases1990=buildNaturalCycleCases('갑인',1990);
const firstYears=[
  [2034,2036,2039,2041,2044,2046,2049,1991,1994,1996,1999,2001,2004,2006,2009,2011,2014,2016,2019,2021,2024,2026,2029,2031],
  [2004,2006,2009,2011,2014,2016,2019,2021,2024,2026,2029,2031,2034,2036,2039,2041,2044,2046,2049,1991,1994,1996,1999,2001]
];
cases1990.forEach((scenario,index)=>{
  eq(scenario.rows.slice(0,24).map(r=>r.calendarYears),firstYears[index].map(y=>[y,y+60]),'Each term lists its two years within the birth-year window');
});
eq(buildNaturalCycleCases('갑인',2034)[0].rows[0].calendarYears,[2034,2094],'The birth year is included');
eq(buildNaturalCycleCases('갑인',2035)[0].rows[0].calendarYears,[2094,2154],'The last year in the 120-year window is included');
eq(buildNaturalCycleCases('갑인',1910)[0].rows[0].calendarYears,[1914,1974],'Dates before the reference epoch work');
eq(buildNaturalCycleCases('갑인',2026)[0].rows[1].calendarYears,[2036,2096]);
eq(buildNaturalCycleCases('갑인',2026)[0].rows[1].extraYears,.5,'The half-year position is preserved');
eq(buildNaturalCycleCases('갑인',2026)[1].rows[12].calendarYears,[2034,2094],'The same anchor is autumn in the second case');
for(const invalid of [null,NaN,1990.5,'1990',0]) {assert.throws(()=>buildNaturalCycleCases('갑인',invalid));checks++;}

// Compare nominal-year ganji to the calendar already used by the calculator,
// away from January/February year boundaries. No exact term month/day is claimed.
for(const [year,expected] of [[1974,'甲寅'],[1991,'辛未'],[2004,'甲申'],[2026,'丙午'],[2034,'甲寅'],[2064,'甲申'],[2094,'甲寅']]) {
  eq(lunarLibrary.Solar.fromYmd(year,7,1).getLunar().getYearInGanZhi(),expected);
}

const {dom,errors}=createCalculatorDom();
const w=dom.window,d=w.document,q=id=>d.getElementById('wm-'+id);
function event(el,type){el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));}
function fill(id,value,type='input'){q(id).value=value;event(q(id),type);}
function submit(){event(q('form'),'submit');}
function table(){return q('variants').querySelector('.manse-cycle-table');}
function years(cell){return [...cell.querySelectorAll('.manse-cycle-calendar-year')].map(el=>Number(el.dataset.year));}
function validateTableYearWindow(expectedBirthYear){
  eq(Number(table().dataset.birthYear),expectedBirthYear);
  assert.ok(table().caption.textContent.includes(`${expectedBirthYear}~${expectedBirthYear+119}년`));checks++;
  const rows=table().querySelectorAll('tbody tr');eq(rows.length,24,'A term is listed once with two years, not as two long tables');
  eq(table().querySelectorAll('.manse-cycle-calendar-year').length,96,'Every term in both cases has exactly two year numbers');
  for(const row of rows)for(const cell of [...row.children].slice(2)){
    const pair=years(cell);eq(pair.length,2);eq(pair[1]-pair[0],60);
    assert.ok(pair[0]>=expectedBirthYear&&pair[1]<expectedBirthYear+120);checks++;
  }
}

eq(errors,[]);q('submit').focus();
for(const [id,value] of [['year','2026'],['month','2'],['day','9'],['hour','12'],['minute','00']])fill(id,value);
for(const [id,value] of [['zone','korea'],['clock','standard'],['boundary','midnight']])fill(id,value,'change');
const gender=d.querySelector('input[name="gender"][value="남자"]');gender.checked=true;event(gender,'change');
submit();eq(q('error').hidden,true);eq(table().dataset.anchor,'갑인');validateTableYearWindow(2026);
let rows=table().querySelectorAll('tbody tr');
eq(rows[0].children[2].querySelector('.manse-cycle-calendar-years').textContent,'2034년 2094년');
eq(years(rows[0].children[3]),[2064,2124]);eq(years(rows[12].children[3]),[2034,2094]);
eq(rows[1].children[2].querySelector('.manse-cycle-value').textContent,'병진년 +0.5년');

fill('year','1990');eq(table(),null,'Editing birth year removes stale year pairs');submit();eq(q('error').hidden,true);validateTableYearWindow(1990);
// A January birth uses the civil birth year, even before the saju year changes.
fill('year','2026');fill('month','1');fill('day','1');submit();eq(q('error').hidden,true);eq(Number(table().dataset.birthYear),2026);
// Lunar 1909-11-20 is solar 1910-01-01: use the converted SOLAR birth year.
q('calendar-lunar').checked=true;event(q('calendar-lunar'),'change');
fill('year','1909');fill('month','11');fill('day','20');submit();eq(q('error').hidden,true);validateTableYearWindow(1910);
eq(q('converted').textContent,'계산에 사용한 양력 1910.01.01');
eq(errors,[]);dom.window.close();
console.log(JSON.stringify({passed:checks,scope:'Two displayed calendar years per term, 60-year separation, 120-year bounds, both cases, birth-year edits, January and lunar year boundaries',browserRendered:false},null,2));
