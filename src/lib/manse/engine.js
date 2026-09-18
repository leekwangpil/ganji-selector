/*
 * Four-pillar calculator. Not a Wonkwang implementation or certification.
 * Optional Korean lunar input is converted to solar before all time/pillar calculations.
 * Year/month: precise solar-term instants from lunar-javascript 1.7.7 (UTC+08).
 * Day anchor: KASI monthly calendar, 2026-09-13 = 庚寅 (index 26).
 * Timezones: frozen IANA Asia/Seoul tzdata; foreign offsets are explicit inputs.
 * Day/hour conventions are required inputs; none is silently labelled Wonkwang's default.
 */
export function createManseEngine(lunarLibrary, timezoneData, calendarAdapter) {
  'use strict';
  const MINUTE = 60000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
  const GAN = ['갑','을','병','정','무','기','경','신','임','계'];
  const JI = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const HAN_GAN = [...'甲乙丙丁戊己庚辛壬癸'];
  const HAN_JI = [...'子丑寅卯辰巳午未申酉戌亥'];
  const JIE = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];
  const JIE_KO = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한'];
  const ALIASES = {DA_XUE:'大雪', DONG_ZHI:'冬至', XIAO_HAN:'小寒', DA_HAN:'大寒', LI_CHUN:'立春', YU_SHUI:'雨水', JING_ZHE:'惊蛰'};
  const termCache = new Map();
  const mod = (n, d) => ((n % d) + d) % d;
  const pad = n => String(n).padStart(2, '0');
  const offsetChoices = [...new Set(timezoneData.transitions.map(row => row[1]))];
  const anchorDay = Date.UTC(2026, 8, 13) / DAY;

  function fail(message, field) { const e = new Error(message); e.field = field; throw e; }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function fields(ms) {
    const d = new Date(ms);
    return [d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  }
  function formatWall(ms, seconds=false) {
    const [y,m,d,h,n,s] = fields(ms);
    return `${y}.${pad(m)}.${pad(d)} ${pad(h)}:${pad(n)}${seconds ? ':'+pad(s) : ''}`;
  }
  function formatOffset(minutes) {
    const absolute = Math.abs(minutes);
    return `UTC${minutes < 0 ? '−' : '+'}${pad(Math.floor(absolute/60))}:${pad(Math.round(absolute%60))}`;
  }
  function zoneAt(utc, input) {
    if (input.zone === 'foreign') {
      const std = input.offset * 60;
      return {offset: std + (input.dst ? 60 : 0), dst: input.dst ? 60 : 0, std};
    }
    let row = timezoneData.transitions[0];
    for (const candidate of timezoneData.transitions) {
      if (candidate[0] > utc) break;
      row = candidate;
    }
    return {offset: row[1], dst: row[2], std: row[1]-row[2]};
  }
  function localCandidates(wall, input) {
    const offsets = input.zone === 'foreign' ? [input.offset*60+(input.dst?60:0)] : offsetChoices;
    return offsets.map(offset => wall - offset*MINUTE)
      .filter(utc => zoneAt(utc, input).offset*MINUTE + utc === wall)
      .sort((a,b) => a-b);
  }
  function termsFor(year) {
    if (termCache.has(year)) return termCache.get(year);
    const table = lunarLibrary.Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
    const terms = Object.entries(table).map(([key, solar]) => {
      const name = ALIASES[key] || key;
      const monthIndex = JIE.indexOf(name);
      const utc = Date.UTC(solar.getYear(), solar.getMonth()-1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond()) - 480*MINUTE;
      return {name, label: JIE_KO[monthIndex] || name, monthIndex, utc};
    }).filter(t => t.monthIndex >= 0).sort((a,b) => a.utc-b.utc);
    termCache.set(year, terms);
    return terms;
  }
  function pillar(ganIndex, jiIndex) {
    const g=mod(ganIndex,10), j=mod(jiIndex,12);
    return {gan:GAN[g], ji:JI[j], hanGan:HAN_GAN[g], hanJi:HAN_JI[j], ko:GAN[g]+JI[j], han:HAN_GAN[g]+HAN_JI[j], ganIndex:g, jiIndex:j};
  }
  function fromCycle(i) { return pillar(mod(i,10), mod(i,12)); }
  function correctedWall(utc, input) {
    const zone = zoneAt(utc, input);
    const correctionOffset = input.clock === 'standard' ? zone.std : input.clock === 'meridian' ? 510 : input.longitude*4;
    return {wall: utc + correctionOffset*MINUTE, correction: correctionOffset-zone.offset, zone};
  }
  function atInstant(utc, input) {
    // The term table is expressed in fixed UTC+08, not the birth site's wall time.
    const year = new Date(utc+480*MINUTE).getUTCFullYear();
    const terms = termsFor(year);
    const spring = terms.find(t => t.name==='立春' && new Date(t.utc+480*MINUTE).getUTCFullYear()===year);
    const solarYear = year - (utc < spring.utc ? 1 : 0);
    const yearPillar = fromCycle(solarYear-4);
    const previous = [...terms].reverse().find(t => t.utc<=utc);
    const next = terms.find(t => t.utc>utc);
    const monthIndex = previous.monthIndex;
    const monthPillar = pillar((yearPillar.ganIndex%5)*2+2+monthIndex, 2+monthIndex);
    const corrected = correctedWall(utc, input);
    const midnightIndex = mod(Math.floor(corrected.wall/DAY)-anchorDay+26,60);
    const timeOfDay = mod(corrected.wall, DAY);
    const lateZi = timeOfDay >= 23*HOUR;
    const dayIndex = midnightIndex + (input.boundary==='zi23' && lateZi ? 1 : 0);
    const hourDayIndex = midnightIndex + (input.boundary!=='midnight' && lateZi ? 1 : 0);
    const hourJi = Math.floor((timeOfDay+HOUR)/(2*HOUR))%12;
    const hourPillar = pillar(mod(hourDayIndex,10)*2+hourJi, hourJi);
    return {year:yearPillar, month:monthPillar, day:fromCycle(dayIndex), hour:hourPillar,
      utc, correctedWall:corrected.wall, correction:corrected.correction, zone:corrected.zone,
      previous, next, nearestTermMs:Math.min(...terms.map(t=>Math.abs(t.utc-utc)))};
  }
  function validate(input) {
    const {year:y, month:m, day:d} = input;
    if (!Number.isInteger(y) || y<1910 || y>2050) fail('연도는 1910~2050 사이의 네 자리 숫자로 입력해 주세요.', 'year');
    if (!Number.isInteger(m) || m<1 || m>12) fail('태어난 월을 선택해 주세요.', 'month');
    if (!Number.isInteger(d) || d<1 || d>daysInMonth(y,m)) fail('올바른 양력 날짜를 선택해 주세요.', 'day');
    if (!input.unknown && (!Number.isInteger(input.hour)||input.hour<0||input.hour>23)) fail('시는 0~23 사이의 정수로 입력해 주세요.', 'hour');
    if (!input.unknown && (!Number.isInteger(input.minute)||input.minute<0||input.minute>59)) fail('분은 0~59 사이의 정수로 입력해 주세요.', 'minute');
    if (!['korea','foreign'].includes(input.zone)) fail('출생 시간대를 선택해 주세요.', 'zone');
    if (input.zone==='foreign' && (!Number.isFinite(input.offset)||input.offset < -12||input.offset > 14||!Number.isInteger(input.offset*60))) fail('해외 출생지의 표준 UTC 시차를 -12~14시간 범위로 입력해 주세요.', 'offset');
    if (!['standard','meridian','longitude'].includes(input.clock)) fail('일주·시주에 적용할 시간 기준을 선택해 주세요.', 'clock');
    if (input.clock==='longitude' && (!Number.isFinite(input.longitude)||Math.abs(input.longitude)>180)) fail('출생지 경도를 -180~180도 범위로 입력해 주세요. 동경은 양수, 서경은 음수입니다.', 'longitude');
    if (!['zi23','split','midnight'].includes(input.boundary)) fail('날짜 변경 기준을 선택해 주세요.', 'boundary');
    if (!['남자','여자'].includes(input.gender)) fail('성별을 선택해 주세요.', 'gender');
  }
  function naturalCycle(p, gender) {
    const g = p.day.ganIndex, j = p.month.jiIndex;
    let branch = j;
    if (g%2 !== j%2) {
      const next = (gender==='남자') === (p.year.ganIndex%2===0);
      branch = mod(j+(next?1:-1),12);
    }
    return pillar(g, branch).ko;
  }
  function calculate(input) {
    if(input.calendar==='lunar'&&!calendarAdapter) fail('음력 변환 기능이 연결되지 않았습니다.','calendar');
    const dates=calendarAdapter?calendarAdapter.resolveDate(input):null;
    if(dates) input={...input,...dates.solar,calendar:'solar',intercalation:false};
    validate(input);
    const baseWall = Date.UTC(input.year,input.month-1,input.day);
    const minutes = input.unknown ? Array.from({length:1440},(_,i)=>i) : [input.hour*60+input.minute];
    const grouped = new Map();
    let first=null, last=null, duplicate=false, missing=0, nearest=Infinity;
    for (const minute of minutes) {
      const candidates=localCandidates(baseWall+minute*MINUTE,input);
      if (!candidates.length) {missing++; continue;}
      if (candidates.length>1) duplicate=true;
      for (const start of candidates) {
        // A minute-only input denotes its whole minute; do not invent birth seconds.
        for (const instant of [start, start+MINUTE-1]) {
          const p=atInstant(instant,input);
          if (input.unknown) p.hour=null;
          p.natural=naturalCycle(p,input.gender);
          const key=[p.year.han,p.month.han,p.day.han,p.hour?.han||'?'].join('|');
          if (!grouped.has(key)) grouped.set(key,{...p, firstUtc:instant,lastUtc:instant});
          else grouped.get(key).lastUtc=instant;
          if (!first || instant<first.utc) first=p;
          if (!last || instant>last.utc) last=p;
          nearest=Math.min(nearest,p.nearestTermMs);
        }
      }
    }
    if (!first) fail('표준시·서머타임 전환으로 존재하지 않는 시각입니다. 출생 기록의 시간을 확인해 주세요.', 'hour');
    return {input:{...input}, dates, variants:[...grouped.values()], first,last,duplicate,missing,
      nearTerm:nearest<2*MINUTE, unknown:input.unknown,
      precision:input.unknown?'day':'minute'};
  }
  function termLabel(term, input) {
    return `${term.label} ${formatWall(term.utc+zoneAt(term.utc,input).offset*MINUTE,true)}`;
  }
  return {calculate, atInstant, termsFor, validate, daysInMonth, localCandidates, zoneAt, correctedWall,
    formatWall, formatOffset, termLabel, naturalCycle, pillar, fields};
}
