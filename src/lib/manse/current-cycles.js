import { buildNaturalCycleCases } from './natural-cycles.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const mod = (n, d) => ((n % d) + d) % d;
const stems = ['갑','을','병','정','무','기','경','신','임','계'];
const branches = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const ganji = Array.from({length:60}, (_, i) => stems[i % 10] + branches[i % 12]);

// This convention is shown before the user runs today's calculation.
// A year/month is its actual interval between the existing engine's boundaries;
// +0.5 is the midpoint of that interval. A day follows the selected clock/boundary.
export const CURRENT_CYCLE_RULE = 'manse-period-midpoint';

export function buildCurrentCycles(engine, {anchorGanji, choice, input, instant, rule}) {
  if (rule !== CURRENT_CYCLE_RULE) throw new Error('오늘의 절기 계산 기준을 확인해 주세요.');
  if (!['spring','autumn'].includes(choice)) throw new Error('입춘 또는 입추를 먼저 선택해 주세요.');
  if (!Number.isFinite(instant)) throw new Error('현재 시각을 확인할 수 없습니다.');
  const year = new Date(instant).getUTCFullYear();
  if (year < 1910 || year > 2050) throw new Error('오늘의 절기 계산 범위는 1910~2050년입니다.');
  engine.validate(input);
  const scenario = buildNaturalCycleCases(anchorGanji)[choice === 'spring' ? 0 : 1];
  const springIndex = ganji.indexOf(scenario.springGanji);
  const pillars = engine.atInstant(instant, input);
  const springs = [...new Map([year - 1, year, year + 1]
    .flatMap(y => engine.termsFor(y))
    .filter(term => term.name === '立春')
    .map(term => [term.utc, term])).values()].sort((a, b) => a.utc - b.utc);
  const yearStart = springs.filter(term => term.utc <= instant).at(-1)?.utc;
  const yearEnd = springs.find(term => term.utc > instant)?.utc;
  const dayShift = input.boundary === 'zi23' ? HOUR : 0;
  const dayStartWall = Math.floor((pillars.correctedWall + dayShift) / DAY) * DAY - dayShift;
  const dayStart = instant - (pillars.correctedWall - dayStartWall);
  const intervals = {
    year: [yearStart, yearEnd],
    month: [pillars.previous.utc, pillars.next.utc],
    day: [dayStart, dayStart + DAY]
  };
  const periods = ['year','month','day'].map(unit => {
    const [start, end] = intervals[unit];
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(start <= instant && instant < end)) {
      throw new Error('현재 절기의 경계 시각을 확인할 수 없습니다.');
    }
    const fraction = (instant - start) / (end - start);
    const elapsed = mod(ganji.indexOf(pillars[unit].ko) - springIndex, 60) + fraction;
    const termIndex = Math.min(23, Math.floor(elapsed / 2.5));
    return {unit, ganji:pillars[unit].ko, term:scenario.rows[termIndex].term, termIndex, elapsed, start, end};
  });
  const zone = engine.zoneAt(instant, input);
  return {
    anchorGanji, choice, rule, instant, periods,
    timestamp:engine.formatWall(instant + zone.offset * 60000),
    offset:engine.formatOffset(zone.offset)
  };
}
