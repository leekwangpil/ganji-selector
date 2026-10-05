import lunarLibrary from 'lunar-javascript';
import KoreanCalendarClass from 'korean-lunar-calendar';
import timezoneData from './timezone.json';
import { createCalendarAdapter } from './calendar-adapter.js';
import { createManseEngine } from './engine.js';
import { buildCurrentCycles, CURRENT_CYCLE_RULE } from './current-cycles.js';

const HOUR = 3600000;
// Report dates use Korea time; birth timezone is separately required.
const wall = ms => new Date(ms + 9 * HOUR).toISOString().replace('Z', '+09:00');
function fail(message) { throw new Error(message); }
export function analyzeCycles(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) fail('JSON 객체가 필요합니다.');
  const { birth, fromYear, toYear } = request;
  if (!birth || typeof birth !== 'object' || Array.isArray(birth)) fail('birth 입력이 필요합니다.');
  if (typeof birth.unknown !== 'boolean') fail('출생 시각 확인 여부 unknown을 지정해 주세요.');
  if (birth.zone === 'foreign' && typeof birth.dst !== 'boolean') fail('해외 출생 시 서머타임 여부 dst를 확인해 주세요.');
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear < 1911 || toYear > 2050 || fromYear > toYear || toYear - fromYear > 19) fail('조회 기간은 1911~2050년 중 최대 20년입니다.');
  const engine = createManseEngine(lunarLibrary, timezoneData, createCalendarAdapter(KoreanCalendarClass));
  const result = engine.calculate(birth);
  const start = Date.UTC(fromYear, 0, 1) - 9 * HOUR;
  const end = Date.UTC(toYear + 1, 0, 1) - 9 * HOUR;
  const terms = [...new Map(Array.from({length:toYear-fromYear+3}, (_,i)=>fromYear-1+i)
    .flatMap(y=>engine.termsFor(y)).map(t=>[t.utc,t])).values()].sort((a,b)=>a.utc-b.utc);
  function timeline(anchorGanji, choice, unit) {
    const boundaries = terms.filter(t=>unit === 'month' || t.name === '立春').map(t=>t.utc);
    const points = new Set([start,end]);
    for(let i=0;i<boundaries.length;i++) {
      const a=boundaries[i], b=boundaries[i+1];
      if(a>start && a<end) points.add(a);
      // A cycle's half-step can change at the midpoint of a year/month.
      if(b !== undefined) { const mid=a+(b-a)/2; if(mid>start && mid<end) points.add(mid); }
    }
    const ordered=[...points].sort((a,b)=>a-b);
    const rows=[];
    for(let i=0;i<ordered.length-1;i++) {
      const a=ordered[i], b=ordered[i+1];
      // KST 1910-01-01 starts in UTC 1909; engine supports UTC years >=1910.
      if(new Date(a).getUTCFullYear()<1910) fail('조회 시작은 1911년 이상으로 지정해 주세요.');
      const cycle=buildCurrentCycles(engine,{anchorGanji,choice,input:result.input,instant:a,rule:CURRENT_CYCLE_RULE});
      const p=cycle.periods.find(p=>p.unit===unit);
      const previous=rows.at(-1);
      if(previous && previous.ganji===p.ganji && previous.term===p.term && previous.end===wall(a)) previous.end=wall(b);
      else rows.push({start:wall(a),end:wall(b),ganji:p.ganji,term:p.term});
    }
    return rows;
  }
  return {
    rule:CURRENT_CYCLE_RULE, reportTimezone:'Asia/Seoul', intervalConvention:'start inclusive, end exclusive',
    range:{fromYear,toYear}, dates:result.dates, birthInput:result.input,
    notes:['운세 해석과 사건 검색을 포함하지 않습니다.','입춘형·입추형은 확정하지 않고 모두 반환합니다.','년운은 입춘, 월운은 절입 기준입니다. 달력 연도·월과 일치하지 않을 수 있습니다.','출생 시간 미상 시 가능한 명식을 모두 반환합니다.'],
    variants:result.variants.map(v=>({
      pillars:{year:v.year.ko,month:v.month.ko,day:v.day.ko,hour:v.hour?.ko??null},anchorGanji:v.natural,
      cases:['spring','autumn'].map(choice=>({choice,year:timeline(v.natural,choice,'year'),month:timeline(v.natural,choice,'month')}))
    }))
  };
}
