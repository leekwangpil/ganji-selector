const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzeCycles}=require('../src/lib/manse/gpt-analysis.js');
const {createManseEngine}=require('../src/lib/manse/engine.js');
const {createCalendarAdapter}=require('../src/lib/manse/calendar-adapter.js');
const {buildCurrentCycles,CURRENT_CYCLE_RULE}=require('../src/lib/manse/current-cycles.js');
const lunar=require('lunar-javascript');
const Korean=require('korean-lunar-calendar');
const tz=require('../src/lib/manse/timezone.json');
const birth={calendar:'solar',year:2000,month:1,day:1,gender:'남자',unknown:true,zone:'korea',clock:'standard',boundary:'zi23'};
test('API timelines match existing calculator across every interval and both possible charts',()=>{
 const report=analyzeCycles({birth,fromYear:2024,toYear:2024});
 const engine=createManseEngine(lunar,tz,createCalendarAdapter(Korean));
 assert.equal(report.variants.length,2);
 for(const v of report.variants) for(const c of v.cases) for(const unit of ['year','month']) {
  const rows=c[unit];
  assert.equal(rows[0].start,'2024-01-01T00:00:00.000+09:00');
  assert.equal(rows.at(-1).end,'2025-01-01T00:00:00.000+09:00');
  for(let i=0;i<rows.length;i++) {
   const r=rows[i],start=Date.parse(r.start),end=Date.parse(r.end);
   assert.ok(end>start);
   if(i) assert.equal(rows[i-1].end,r.start);
   for(const instant of [start,start+(end-start)/2,end-1]) {
    const original=buildCurrentCycles(engine,{anchorGanji:v.anchorGanji,choice:c.choice,input:report.birthInput,instant,rule:CURRENT_CYCLE_RULE}).periods.find(p=>p.unit===unit);
    assert.equal(r.term,original.term); assert.equal(r.ganji,original.ganji);
   }
  }
 }
});
test('known birth time returns original exact chart and bounded report',()=>{
 const r=analyzeCycles({birth:{...birth,unknown:false,hour:12,minute:0},fromYear:2026,toYear:2026});
 assert.equal(r.variants.length,1); assert.ok(r.variants[0].pillars.hour);
});
test('invalid ranges and unconfirmed birth inputs fail',()=>{
 assert.throws(()=>analyzeCycles({birth,fromYear:2020,toYear:2040}));
 assert.throws(()=>analyzeCycles({birth:{...birth,unknown:undefined},fromYear:2024,toYear:2024}));
 assert.throws(()=>analyzeCycles({birth:{...birth,zone:'foreign',offset:9},fromYear:2024,toYear:2024}));
 assert.throws(()=>analyzeCycles({birth,fromYear:1499,toYear:1499}));
});
