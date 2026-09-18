import lunarLibrary from 'lunar-javascript';
import { buildNaturalCycleCases } from './natural-cycles.js';

const DAY = 86400000;
const mod = (n, d) => ((n % d) + d) % d;
const pad = n => String(n).padStart(2, '0');
const stems = ['갑','을','병','정','무','기','경','신','임','계'];
const branches = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const ganji = Array.from({length:60}, (_, i) => stems[i % 10] + branches[i % 12]);

export const PERIOD_UNITS = Object.freeze({
  year: {suffix:'년', measure:'년', label:'60년 주기'},
  month: {suffix:'월', measure:'개월', label:'60개월 주기'},
  day: {suffix:'일', measure:'일', label:'60일 주기'}
});

// Display dates are civil calendar labels, not precise fortune-transition times.
// In particular, 0.5 month remains a relative half-month, never a made-up 15 days.
export function parsePeriodStart(unit, value) {
  const pattern = unit === 'month' ? /^(\d{4})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = typeof value === 'string' && pattern.exec(value);
  const year = match ? Number(match[1]) : NaN;
  const month = match ? Number(match[2]) : NaN;
  const day = unit === 'month' ? 1 : match ? Number(match[3]) : NaN;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!['month','day'].includes(unit) || year < 1900 || year > 2100 ||
      date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new Error(`표시 시작 ${unit === 'month' ? '월을' : '날짜를'} 1900~2100년 범위에서 입력해 주세요.`);
  }
  return {year, month, day};
}

function periodAt(unit, index) {
  if (unit === 'month') {
    const year = Math.floor(index / 12), month = mod(index, 12) + 1;
    return {year, month, key:`${year}-${pad(month)}`, label:`${year}.${pad(month)}`};
  }
  const date = new Date(index * DAY);
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, day = date.getUTCDate();
  return {year, month, day, key:`${year}-${pad(month)}-${pad(day)}`, label:`${year}.${pad(month)}.${pad(day)}`};
}

export function buildNaturalPeriodCases(anchorGanji, unit, startValue) {
  const positions = buildNaturalCycleCases(anchorGanji);
  const start = parsePeriodStart(unit, startValue);
  const serial = unit === 'month' ? start.year * 12 + start.month - 1 : Date.UTC(start.year, start.month - 1, start.day) / DAY;
  // Mid-month is safely after that month's Jie in the supported display range.
  // getMonthInGanZhiExact uses solar-term months, not Chinese lunar months.
  const lunar = lunarLibrary.Solar.fromYmdHms(start.year, start.month, unit === 'month' ? 15 : start.day, 12, 0, 0).getLunar();
  const reference = lunarLibrary.LunarUtil.getJiaZiIndex(unit === 'month' ? lunar.getMonthInGanZhiExact() : lunar.getDayInGanZhi());
  return {
    unit, start:periodAt(unit, serial), end:periodAt(unit, serial + 119),
    cases:positions.map(scenario => ({
      anchorGanji, anchorTerm:scenario.anchorTerm,
      springGanji:scenario.springGanji, autumnGanji:scenario.autumnGanji,
      rows:scenario.rows.map(position => {
        const offset = mod(ganji.indexOf(position.ganji) - reference, 60);
        return {
          term:position.term, label:position.label, ganji:position.ganji,
          elapsed:position.elapsedYears, extra:position.extraYears,
          periods:[periodAt(unit, serial + offset), periodAt(unit, serial + offset + 60)]
        };
      })
    }))
  };
}

export function todayInKorea(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
