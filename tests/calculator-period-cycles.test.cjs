const assert = require('node:assert/strict');
const { test } = require('node:test');
const lunar = require('lunar-javascript');
const KoreanCalendar = require('korean-lunar-calendar');
const { createCalendarAdapter } = require('../src/lib/manse/calendar-adapter.js');
const { createManseEngine } = require('../src/lib/manse/engine.js');
const { buildNaturalCycleCases } = require('../src/lib/manse/natural-cycles.js');
const { buildNaturalPeriodCases, parsePeriodStart, todayInKorea } = require('../src/lib/manse/period-cycles.js');
const { createCalculatorDom } = require('./helpers.cjs');
const timezone = require('../src/lib/manse/timezone.json');
const engine = createManseEngine(lunar, timezone, createCalendarAdapter(KoreanCalendar));
const base = {calendar:'solar',year:2026,month:2,day:9,hour:12,minute:0,unknown:false,gender:'남자',zone:'korea',clock:'standard',boundary:'midnight'};
const keys = row => row.periods.map(date => date.key);
const dayNumber = value => Date.parse(value + 'T00:00:00Z') / 86400000;

test('month and day cycles share the approved anchor, half-step positions and opposite case', () => {
  const stems = ['갑','을','병','정','무','기','경','신','임','계'];
  const branches = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  for (let i = 0; i < 60; i++) {
    const anchor = stems[i % 10] + branches[i % 12];
    const years = buildNaturalCycleCases(anchor);
    for (const unit of ['month','day']) {
      const result = buildNaturalPeriodCases(anchor, unit, unit === 'month' ? '2026-09' : '2026-09-18');
      result.cases.forEach((scenario, index) => {
        assert.deepEqual(scenario.rows.map(row => [row.term,row.elapsed,row.ganji,row.extra]), years[index].rows.map(row => [row.term,row.elapsedYears,row.ganji,row.extraYears]));
        assert.equal(scenario.rows[24].ganji, scenario.rows[0].ganji);
      });
      assert.equal(result.cases[0].rows[0].ganji, anchor);
      assert.equal(result.cases[1].rows[12].ganji, anchor);
    }
  }
});

test('known anchor dates, five-year repeats, sixty-day repeats and leap days', () => {
  const months = buildNaturalPeriodCases('갑인','month','2023-02');
  assert.deepEqual(keys(months.cases[0].rows[0]), ['2023-02','2028-02']);
  assert.deepEqual(keys(months.cases[1].rows[0]), ['2025-08','2030-08']);
  assert.deepEqual(keys(months.cases[0].rows[1]), ['2023-04','2028-04']);
  assert.equal(months.cases[0].rows[1].extra, 0.5);
  assert.equal(months.end.key, '2033-01');
  assert.deepEqual(keys(buildNaturalPeriodCases('갑인','month','2023-03').cases[0].rows[0]), ['2028-02','2033-02']);
  const days = buildNaturalPeriodCases('갑인','day','2026-02-09');
  assert.deepEqual(keys(days.cases[0].rows[0]), ['2026-02-09','2026-04-10']);
  assert.deepEqual(keys(days.cases[1].rows[0]), ['2026-03-11','2026-05-10']);
  const leap = buildNaturalPeriodCases('갑자','day','2024-02-29');
  assert.equal(leap.start.key, '2024-02-29');
  assert.equal(dayNumber(leap.end.key) - dayNumber(leap.start.key), 119);
});

test('displayed month/day ganji agree with the independent existing manse engine', () => {
  // The existing engine computes month pillars from Jie instants and day pillars
  // from its KASI reference day; this catches a wrong lunar-month/day convention.
  for (const [unit,start] of [['month','2022-12'],['day','2024-02-01'],['day','2026-12-01']]) {
    const result = buildNaturalPeriodCases('갑인',unit,start);
    for (const scenario of result.cases) for (const row of scenario.rows.slice(0,24)) {
      const [first,second] = row.periods;
      if (unit === 'month') {
        assert.equal((second.year - first.year) * 12 + second.month - first.month, 60);
      } else {
        assert.equal(dayNumber(second.key) - dayNumber(first.key), 60);
      }
      for (const period of row.periods) {
        assert.ok(period.key >= result.start.key && period.key <= result.end.key);
        const value = engine.calculate({...base,year:period.year,month:period.month,day:unit === 'month' ? 15 : period.day});
        assert.equal(value.variants[0][unit].ko, row.ganji, `${unit} ${period.key}`);
      }
    }
  }
});

test('valid display range edges and invalid input are handled without date normalization', () => {
  for (const unit of ['month','day']) for (const year of [1900,2100]) {
    const result = buildNaturalPeriodCases('계해',unit,`${year}-12` + (unit === 'day' ? '-31' : ''));
    assert.equal(result.cases[0].rows.length, 25);
    assert.ok(result.cases.flatMap(c => c.rows).every(r => r.periods.every(p => p.key >= result.start.key && p.key <= result.end.key)));
  }
  for (const value of ['',null,'2023-02-29','2024-04-31','2026-13-01','1899-12-31','2101-01-01']) {
    assert.throws(() => parsePeriodStart('day',value));
  }
  for (const value of ['',undefined,'2026-00','2026-13','2026-02-09']) assert.throws(() => parsePeriodStart('month',value));
  assert.throws(() => buildNaturalPeriodCases('갑축','month','2026-01'));
  assert.equal(todayInKorea(new Date('2026-09-17T15:00:00Z')), '2026-09-18');
  assert.equal(todayInKorea(new Date('2026-09-17T14:59:59Z')), '2026-09-17');
});

test('switching cycles preserves birth results and choices; invalid periods clear stale cycles', () => {
  const {dom,errors,cleanup} = createCalculatorDom();
  try {
    const d = dom.window.document, q = id => d.getElementById('wm-' + id);
    const event = (el,type) => el.dispatchEvent(new dom.window.Event(type,{bubbles:true,cancelable:true}));
    const fill = (id,value) => {q(id).value = value;event(q(id),'input');};
    const submit = () => {event(q('form'),'submit');assert.equal(q('error').hidden,true,q('error').textContent);};
    const table = () => q('variants').querySelector('.manse-cycle-table');
    const choice = () => q('variants').querySelector('.manse-cycle-choice');
    const select = value => choice().querySelector(`input[value=${value}]`).click();
    const chosen = () => choice().querySelector('input:checked')?.value;
    assert.equal(q('cycle-controls').hidden,true);
    q('submit').focus();
    for (const [id,value] of [['name','확인용'],['year','2026'],['month','02'],['day','09'],['hour','12'],['minute','00']]) fill(id,value);
    d.querySelector('input[name=gender][value="남자"]').click();submit();
    const summary = q('summary').textContent, pillars = q('variants').querySelector('.manse-pillars');
    select('spring');
    q('cycle-month').click();fill('cycle-start-month','2023-02');
    assert.equal(table().dataset.unit,'month');assert.equal(table().dataset.anchor,'갑인');
    assert.equal(table().querySelectorAll('tbody tr').length,24);
    assert.equal(table().querySelectorAll('[data-date]').length,96);
    assert.equal(q('variants').querySelector('.manse-natural strong').textContent,'갑인월이 입춘 또는 입추입니다.');
    assert.equal(choice().querySelector('legend').textContent,'갑인월이');
    assert.equal(chosen(),undefined);select('autumn');
    assert.equal(q('summary').textContent,summary);assert.equal(q('variants').querySelector('.manse-pillars'),pillars);
    q('cycle-day').click();fill('cycle-start-day','2026-02-09');
    assert.equal(table().dataset.unit,'day');assert.equal(choice().querySelector('legend').textContent,'갑인일이');
    assert.equal(chosen(),undefined);select('undecided');
    assert.equal(table().querySelector('[data-date]').dataset.date,'2026-02-09');
    q('cycle-year').click();assert.equal(chosen(),'spring');assert.equal(table().dataset.birthYear,'2026');
    q('cycle-month').click();assert.equal(chosen(),'autumn');
    q('cycle-day').click();assert.equal(chosen(),'undecided');
    fill('cycle-start-day','');
    assert.equal(table(),null);assert.equal(q('cycle-error').hidden,false);
    assert.equal(q('variants').querySelector('.manse-pillars'),pillars);
    fill('cycle-start-day','2026-03-01');assert.equal(q('cycle-error').hidden,true);assert.equal(chosen(),'undecided');
    q('cycle-today').click();assert.equal(q('cycle-start-day').value,todayInKorea());
    fill('day','10');assert.equal(q('cycle-controls').hidden,true);assert.equal(q('variants').children.length,0);
    submit();assert.equal(chosen(),undefined);
    fill('month','09');fill('day','13');q('unknown').click();submit();
    const groups = [...q('variants').querySelectorAll('.manse-cycle-choice')];
    assert.deepEqual(groups.map(group => group.dataset.anchor),['경술','신유']);
    assert.notEqual(groups[0].id,groups[1].id);
    groups[0].querySelector('input[value=spring]').click();groups[1].querySelector('input[value=autumn]').click();
    q('cycle-month').click();q('cycle-day').click();
    assert.deepEqual([...q('variants').querySelectorAll('.manse-cycle-choice input:checked')].map(input => input.value),['spring','autumn']);
    assert.deepEqual(errors,[]);
  } finally {cleanup();dom.window.close();}
});
