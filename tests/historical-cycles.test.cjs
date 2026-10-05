const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzeCycles}=require('../src/lib/manse/gpt-analysis.js');
const {createManseEngine}=require('../src/lib/manse/engine.js');
const lunar=require('lunar-javascript');
const tz=require('../src/lib/manse/timezone.json');
// Independent Gregorian JDN arithmetic (integer calendar formula).
function jdn(y,m,d) { const a=Math.floor((14-m)/12);y=y+4800-a;m=m+12*a-3;return d+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045; }
const base={calendar:'solar',calendarStyle:'gregorian',month:10,day:10,gender:'남자',unknown:false,hour:12,minute:0,zone:'foreign',offset:0,dst:false,clock:'standard',boundary:'midnight'};
test('1500 onward Gregorian day pillars agree with independent JDN arithmetic including 1582 gap',()=>{
 for(const year of [1500,1504,1582,1600,1700,1800,1879,1900]) {
  const r=analyzeCycles({birth:{...base,year},fromYear:year,toYear:year});
  const p=r.variants[0].pillars.day;
  const stems=['갑','을','병','정','무','기','경','신','임','계'],branches=['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const i=((jdn(year,10,10)+49)%60+60)%60;
  assert.equal(p,stems[i%10]+branches[i%12]);
  assert.equal(r.dates.lunar,null);
 }
});
test('pre-reform solar terms retain the library absolute Julian day instead of Julian date fields',()=>{
 const e=createManseEngine(lunar,tz,null,{minimumYear:1500,historical:true});
 for(const year of [1500,1582,1700]) {
  const table=lunar.Solar.fromYmd(year,6,1).getLunar().getJieQiTable();
  for(const t of e.termsFor(year)) {
   const solar=Object.values(table).find(s=>Math.abs(Math.round((s.getJulianDay()-2440587.5)*86400000)-480*60000-t.utc)<1);
   assert.ok(solar);
   const date=new Date(t.utc+480*60000);
   const jd=jdn(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate())-0.5+(date.getUTCHours()*3600+date.getUTCMinutes()*60+date.getUTCSeconds())/86400;
   assert.ok(Math.abs(jd-solar.getJulianDay())<1/86400);
  }
 }
});
test('historical unknown time, seconds-level offset and range endpoint work; unconfirmed history fails',()=>{
 const r=analyzeCycles({birth:{...base,year:1879,unknown:true,offset:2400/3600},fromYear:1500,toYear:1500});
 assert.ok(r.variants.every(v=>v.pillars.hour===null));
 assert.equal(r.variants[0].cases[0].year[0].start,'1500-01-01T00:00:00.000+09:00');
 assert.throws(()=>analyzeCycles({birth:{...base,year:1500,calendarStyle:undefined},fromYear:1500,toYear:1500}),/gregorian/);
 assert.throws(()=>analyzeCycles({birth:{...base,year:1500,zone:'korea'},fromYear:1500,toYear:1500}),/시차/);
 assert.throws(()=>analyzeCycles({birth:{...base,year:1500,calendar:'lunar'},fromYear:1500,toYear:1500}));
});
