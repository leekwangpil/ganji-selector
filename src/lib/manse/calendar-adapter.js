/* Korean calendar conversion only. Its lunar-year/month ganji must NOT be used
 * as saju year/month pillars; those remain based on solar-term instants.
 * korean-lunar-calendar 0.4.0, https://github.com/usingsky/korean_lunar_calendar_js
 */
export function createCalendarAdapter(KoreanLunarCalendar) {
  const minimum={year:1910,month:1,day:1}, maximum={year:2050,month:12,day:31};
  const number=d=>d.year*10000+d.month*100+d.day;
  const inRange=d=>number(d)>=number(minimum) && number(d)<=number(maximum);
  const cache=new Map();
  function fail(message,field) {const e=new Error(message);e.field=field;throw e;}
  function fromSolar(date) {
    const c=new KoreanLunarCalendar();
    if(!c.setSolarDate(date.year,date.month,date.day)) return null;
    return {solar:c.getSolarCalendar(),lunar:c.getLunarCalendar()};
  }
  const lunarMinimum=fromSolar(minimum).lunar;
  const lunarMaximum=fromSolar(maximum).lunar;
  function format(date,lunar=false) {
    const pad=n=>String(n).padStart(2,'0');
    return `${date.year}.${pad(date.month)}.${pad(date.day)}${lunar?(date.intercalation?' (윤달)':' (평달)'):''}`;
  }
  function resolveDate(input) {
    const mode=input.calendar===undefined?'solar':input.calendar;
    if(!['solar','lunar'].includes(mode)) fail('양력 또는 음력을 선택해 주세요.','calendar');
    const y=input.year,m=input.month,d=input.day;
    const minimumYear=mode==='lunar'?lunarMinimum.year:minimum.year;
    if(!Number.isInteger(y)||y<minimumYear||y>maximum.year) fail(`연도는 ${minimumYear}~${maximum.year} 사이의 네 자리 숫자로 입력해 주세요.`,'year');
    if(!Number.isInteger(m)||m<1||m>12) fail('태어난 월을 선택해 주세요.','month');
    if(!Number.isInteger(d)||d<1||d>(mode==='lunar'?30:31)) fail(`올바른 ${mode==='lunar'?'음력':'양력'} 날짜를 선택해 주세요.`,'day');
    const c=new KoreanLunarCalendar();
    if(mode==='lunar') {
      if(typeof input.intercalation!=='boolean') fail('음력 월을 평달 또는 윤달로 선택해 주세요.','month');
      if(!c.setLunarDate(y,m,d,input.intercalation)) fail(input.intercalation?'해당 연도·월의 윤달 날짜가 존재하지 않거나 지원 범위를 벗어났습니다.':'올바른 음력 날짜를 선택해 주세요. 지원 범위의 마지막 날은 음력 2050.11.18입니다.','day');
      const resolved=c.getLunarCalendar();
      if(resolved.year!==y||resolved.month!==m||resolved.day!==d||resolved.intercalation!==input.intercalation) fail('요청한 음력 날짜와 변환 결과가 일치하지 않습니다.','day');
    } else if(!c.setSolarDate(y,m,d)) fail('올바른 양력 날짜를 선택해 주세요.','day');
    const solar=c.getSolarCalendar(), lunar=c.getLunarCalendar();
    if(!inRange(solar)) fail(`계산 가능한 음력 날짜는 ${format(lunarMinimum)}~${format(lunarMaximum)}입니다.`,'day');
    return {calendar:mode,solar,lunar};
  }
  function lunarMonths(year) {
    if(!Number.isInteger(year)||year<lunarMinimum.year||year>lunarMaximum.year) return [];
    if(cache.has(year)) return cache.get(year);
    const months=[];
    const c=new KoreanLunarCalendar();
    for(let month=1;month<=12;month++) {
      for(const intercalation of [false,true]) {
        const days=[];
        // Only expose real dates inside the shared solar calculation range.
        for(let day=1;day<=30;day++) {
          if(c.setLunarDate(year,month,day,intercalation) && inRange(c.getSolarCalendar())) days.push(day);
        }
        if(days.length) months.push({value:(intercalation?'L':'')+month,month,intercalation,
          label:intercalation?`윤${month}월`:`${month}월`,days});
      }
    }
    cache.set(year,months);
    return months;
  }
  return {resolveDate,lunarMonths,format,minimum,maximum,lunarMinimum,lunarMaximum};
}
