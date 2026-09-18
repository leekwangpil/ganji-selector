const assert=require('node:assert/strict');
const {createCalculatorDom}=require('./helpers.cjs');
const {buildNaturalCycleCases}=require('../src/lib/manse/natural-cycles.js');
let checks=0;
function eq(a,b,label){assert.deepEqual(a,b,label);checks++;}

// Exact sequences agreed with the user, including the next cycle's first point.
const expectedTerms=['입춘','우수','경칩','춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지','소한','대한','다음 입춘'];
const expectedYears=[0,2.5,5,7.5,10,12.5,15,17.5,20,22.5,25,27.5,30,32.5,35,37.5,40,42.5,45,47.5,50,52.5,55,57.5,60];
const gapin=['갑인','병진','기미','신유','갑자','병인','기사','신미','갑술','병자','기묘','신사','갑신','병술','기축','신묘','갑오','병신','기해','신축','갑진','병오','기유','신해','갑인'];
const gapsin=['갑신','병술','기축','신묘','갑오','병신','기해','신축','갑진','병오','기유','신해','갑인','병진','기미','신유','갑자','병인','기사','신미','갑술','병자','기묘','신사','갑신'];
for(const [anchor,expected] of [['갑인',[gapin,gapsin]],['갑신',[gapsin,gapin]]]) {
  const cases=buildNaturalCycleCases(anchor);
  eq(cases.map(c=>c.anchorTerm),['입춘','입추']);
  cases.forEach((scenario,index)=>{
    eq(scenario.rows.map(r=>r.label),expectedTerms);
    eq(scenario.rows.map(r=>r.elapsedYears),expectedYears);
    eq(scenario.rows.map(r=>r.ganji),expected[index]);
    eq(scenario.rows.map(r=>r.extraYears),[0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0,.5,0]);
  });
}
// Every possible calculator result gets BOTH cases, not only the two examples.
const stems=['갑','을','병','정','무','기','경','신','임','계'];
const branches=['자','축','인','묘','진','사','오','미','신','유','술','해'];
for(let n=0;n<60;n++){
  const anchor=stems[n%10]+branches[n%12],cases=buildNaturalCycleCases(anchor);
  eq(cases[0].rows[0].ganji,anchor);
  eq(cases[1].rows[12].ganji,anchor);
  eq(cases[0].rows[12].ganji,cases[1].rows[0].ganji);
  eq(cases.map(c=>c.rows[24].ganji),cases.map(c=>c.rows[0].ganji),'Each case returns to its own spring after 60 years');
}
eq(buildNaturalCycleCases('계해')[0].rows[1].ganji,'을축','The sexagenary sequence wraps correctly');
assert.throws(()=>buildNaturalCycleCases('갑축'));checks++;
assert.throws(()=>buildNaturalCycleCases(''));checks++;

const {dom,errors}=createCalculatorDom();
const w=dom.window,d=w.document,q=id=>d.getElementById('wm-'+id);
function event(el,type){el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));}
function fill(id,value,type='input'){q(id).value=value;event(q(id),type);}
function submit(){event(q('form'),'submit');}
function tables(){return [...q('variants').querySelectorAll('.manse-cycle-table')];}
function checkTable(table,anchor,expected){
  eq(table.dataset.anchor,anchor);
  eq(table.querySelectorAll('thead th').length,4,'Both scenarios are visible in the same table');
  eq([...table.querySelectorAll('thead [data-anchor-term]')].map(c=>c.dataset.anchorTerm),['입춘','입추']);
  const rows=[...table.querySelectorAll('tbody tr')];eq(rows.length,24);
  eq(rows.map(r=>r.querySelector('th').textContent),expectedTerms.slice(0,24));
  eq(rows.map(r=>Number(r.dataset.elapsed)),expectedYears.slice(0,24));
  for(let index=0;index<2;index++)eq(rows.map(r=>r.children[index+2].dataset.ganji),expected[index].slice(0,24));
  eq(rows[1].children[2].querySelector('.manse-cycle-value').textContent,expected[0][1]+'년 +0.5년');
  eq(table.closest('details'),null,'The requested cycles are displayed without opening another control');
}

eq(errors,[]);eq(tables().length,0,'No cycle is invented before calculation');
q('submit').focus();fill('year','2026');fill('month','2');fill('day','9');fill('hour','12');fill('minute','00');
fill('zone','korea','change');fill('clock','standard','change');fill('boundary','midnight','change');
const male=d.querySelector('input[name="gender"][value="남자"]');male.checked=true;event(male,'change');
submit();eq(q('error').hidden,true);eq(tables().length,1);checkTable(tables()[0],'갑인',[gapin,gapsin]);
eq(q('variants').querySelector('.manse-natural strong').textContent,'갑인년이 입춘 또는 입추입니다.');
submit();eq(tables().length,1,'Recalculation replaces the old table');
fill('month','8');eq(tables().length,0,'Changing the birthday removes stale cycles immediately');
fill('day','8');submit();eq(q('error').hidden,true);checkTable(tables()[0],'갑신',[gapsin,gapin]);

// When an unknown birth time produces different results, each gets both cases.
fill('month','9');fill('day','13');fill('boundary','zi23','change');q('unknown').checked=true;event(q('unknown'),'change');
submit();eq(q('error').hidden,true);eq(tables().map(t=>t.dataset.anchor),['경술','신유']);
for(const table of tables()){
  const rows=table.querySelectorAll('tbody tr');
  eq(rows[0].children[2].dataset.ganji,table.dataset.anchor);
  eq(rows[12].children[3].dataset.ganji,table.dataset.anchor);
}
fill('month','13');eq(tables().length,0);submit();eq(q('error').hidden,false);eq(tables().length,0,'An invalid calculation cannot leave old cycles visible');
eq(errors,[]);dom.window.close();
console.log(JSON.stringify({passed:checks,scope:'Approved 24-term sequences, both cases for all 60 ganji, computed-result integration, multiple results, stale result clearing',browserRendered:false},null,2));
