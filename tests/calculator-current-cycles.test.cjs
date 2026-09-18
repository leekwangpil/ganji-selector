const assert = require('node:assert/strict');
const { test } = require('node:test');
const lunar = require('lunar-javascript');
const KoreanCalendar = require('korean-lunar-calendar');
const { createCalendarAdapter } = require('../src/lib/manse/calendar-adapter.js');
const { createManseEngine } = require('../src/lib/manse/engine.js');
const { buildCurrentCycles, CURRENT_CYCLE_RULE } = require('../src/lib/manse/current-cycles.js');
const { createCalculatorDom } = require('./helpers.cjs');
const timezone = require('../src/lib/manse/timezone.json');
const engine = createManseEngine(lunar, timezone, createCalendarAdapter(KoreanCalendar));
const base = {calendar:'solar',year:2026,month:2,day:9,hour:12,minute:0,unknown:false,gender:'남자',zone:'korea',clock:'standard',boundary:'midnight'};
const day = 86400000;
const calculate = (anchorGanji,instant,choice='spring',input=base) => buildCurrentCycles(engine,{anchorGanji,choice,input,instant,rule:CURRENT_CYCLE_RULE});
const period = (value,unit) => value.periods.find(p => p.unit === unit);
const term = (anchor,instant,unit,choice='spring',input=base) => period(calculate(anchor,instant,choice,input),unit).term;
const jie = (year,name) => engine.termsFor(year).find(t => t.name === name && new Date(t.utc + 8 * 3600000).getUTCFullYear() === year).utc;

test('daily terms switch at the exact half-day and reuse the selected time convention', () => {
  const start = Date.parse('2026-02-09T00:00:00+09:00');
  assert.equal(period(calculate('갑인',start),'day').ganji,'갑인');
  assert.equal(term('갑인',start - 1,'day'),'대한');
  assert.equal(term('갑인',start,'day'),'입춘');
  assert.equal(term('갑인',start + 2.5 * day - 1,'day'),'입춘');
  assert.equal(term('갑인',start + 2.5 * day,'day'),'우수');
  assert.equal(term('갑인',start + 60 * day,'day'),'입춘');
  assert.equal(term('갑인',start,'day','autumn'),'입추');
  const zi = {...base,boundary:'zi23'};
  const ziStart = start - 3600000;
  assert.equal(term('갑인',ziStart - 1,'day','spring',zi),'대한');
  assert.equal(term('갑인',ziStart,'day','spring',zi),'입춘');
  assert.equal(term('갑인',ziStart + 2.5 * day,'day','spring',zi),'우수');
  assert.equal(term('갑인',start + 2.5 * day,'day','spring',{...base,clock:'meridian'}),'입춘');
  assert.equal(term('갑인',start + 2.5 * day,'day','spring',{...base,clock:'longitude',longitude:135}),'우수');
  assert.equal(term('갑인',start + 2.5 * day,'day','spring',{...base,boundary:'split'}),'우수');
  const foreign = calculate('갑인',start + 2.5 * day,'spring',{...base,zone:'foreign',offset:0,dst:false});
  assert.equal(period(foreign,'day').term,'입춘');
  assert.equal(foreign.offset,'UTC+00:00');
  assert.equal(foreign.timestamp,'2026.02.11 03:00');
});

test('year/month transitions use actual Jie instants and explicit period midpoints', () => {
  const spring = jie(2024,'立春');
  assert.equal(term('갑진',spring - 1,'year'),'대한');
  assert.equal(term('갑진',spring,'year'),'입춘');
  const yearMid = (jie(2026,'立春') + jie(2027,'立春')) / 2;
  assert.equal(term('갑진',yearMid - 1,'year'),'입춘');
  assert.equal(term('갑진',yearMid,'year'),'우수');
  assert.equal(term('갑진',yearMid,'year','autumn'),'처서');
  const monthStart = jie(2023,'立春');
  assert.equal(period(calculate('갑인',monthStart),'month').ganji,'갑인');
  assert.equal(term('갑인',monthStart - 1,'month'),'대한');
  assert.equal(term('갑인',monthStart,'month'),'입춘');
  const monthMid = (jie(2023,'清明') + jie(2023,'立夏')) / 2;
  assert.equal(term('갑인',monthMid - 1,'month'),'입춘');
  assert.equal(term('갑인',monthMid,'month'),'우수');
  assert.equal(term('갑인',jie(2028,'立春'),'month'),'입춘');
  for (const instant of [Date.parse('2024-02-29T23:30:00+09:00'),Date.parse('2026-01-01T00:00:00+09:00')]) {
    assert.ok(calculate('갑인',instant).periods.every(p => p.start <= instant && instant < p.end));
  }
});

test('all 60 anchors keep the same shared choice and opposite terms in all three cycles', () => {
  const instant = Date.parse('2026-09-18T19:30:00+09:00');
  for (let i = 0; i < 60; i++) {
    const anchor = engine.pillar(i,i).ko;
    const spring = calculate(anchor,instant), autumn = calculate(anchor,instant,'autumn');
    assert.deepEqual(spring.periods.map(p => p.unit),['year','month','day']);
    spring.periods.forEach((p,index) => {
      assert.equal(p.ganji,autumn.periods[index].ganji);
      assert.equal((p.termIndex + 12) % 24,autumn.periods[index].termIndex);
      assert.ok(p.elapsed >= 0 && p.elapsed < 60);
    });
  }
  assert.throws(() => calculate('갑인',instant,'undecided'),/선택/);
  assert.throws(() => calculate('갑축',instant),/60갑자/);
  assert.throws(() => calculate('갑인',NaN),/시각/);
  assert.throws(() => buildCurrentCycles(engine,{anchorGanji:'갑인',choice:'spring',input:base,instant}),/기준/);
});

test('today shows only three cards after the basis is applied; choice changes and new dates refresh them', () => {
  const {dom,errors,cleanup} = createCalculatorDom();
  const originalNow = Date.now;
  let now = Date.parse('2026-02-09T00:00:00+09:00');
  Date.now = () => now;
  try {
    const d = dom.window.document, q = id => d.getElementById('wm-' + id);
    const event = (el,type) => el.dispatchEvent(new dom.window.Event(type,{bubbles:true,cancelable:true}));
    const fill = (id,value) => {q(id).value = value;event(q(id),'input');};
    const submit = () => {event(q('form'),'submit');assert.equal(q('error').hidden,true,q('error').textContent);};
    assert.equal(q('cycle-controls'),null);
    assert.equal(d.querySelector('[name="cycle-unit"]'),null);
    q('submit').focus();
    for (const [id,value] of [['year','2026'],['month','02'],['day','09'],['hour','12'],['minute','00']]) fill(id,value);
    d.querySelector('input[name=gender][value="남자"]').click();
    q('boundary').value='midnight';event(q('boundary'),'change');submit();
    const section=q('variants').querySelector('.manse-variant'),table=section.querySelector('table'),pillars=section.querySelector('.manse-pillars');
    const panel=section.querySelector('.manse-current-cycles'),button=panel.querySelector('button'),result=panel.querySelector('.manse-current-result');
    const select = value => section.querySelector(`.manse-cycle-choice input[value=${value}]`).click();
    const terms = () => [...panel.querySelectorAll('.manse-current-card')].map(card => card.dataset.term);
    assert.equal(button.disabled,true);assert.equal(result.hidden,true);
    select('spring');assert.equal(button.disabled,false);assert.equal(result.hidden,true);
    assert.match(panel.textContent,/계산 기준을 확인/);
    button.click();assert.equal(result.hidden,false);assert.equal(terms().length,3);assert.equal(terms()[2],'입춘');
    assert.deepEqual(terms(),calculate('갑인',now).periods.map(p => p.term));
    select('autumn');assert.deepEqual(terms(),calculate('갑인',now,'autumn').periods.map(p => p.term));
    assert.equal(section.querySelector('table'),table);assert.equal(section.querySelector('.manse-pillars'),pillars);
    assert.equal(table.querySelectorAll('tbody tr').length,24);assert.equal(q('variants').querySelectorAll('table').length,1);
    select('undecided');assert.equal(result.hidden,true);assert.equal(terms().length,0);assert.equal(button.disabled,true);
    select('spring');assert.equal(result.hidden,false);
    now += 2.5 * day;event(dom.window,'focus');assert.equal(terms()[2],'우수');
    assert.match(panel.querySelector('.manse-current-stamp').textContent,/2026.02.11 12:00/);
    fill('day','10');assert.equal(q('variants').children.length,0);
    submit();assert.equal(q('variants').querySelector('.manse-current-result').hidden,true);
    assert.equal(q('variants').querySelector('.manse-current-button').disabled,true);
    fill('month','09');fill('day','13');q('boundary').value='zi23';event(q('boundary'),'change');q('unknown').click();submit();
    const sections=[...q('variants').querySelectorAll('.manse-variant')];assert.equal(sections.length,2);
    sections[0].querySelector('input[value=spring]').click();sections[0].querySelector('.manse-current-button').click();
    sections[1].querySelector('input[value=autumn]').click();
    assert.equal(sections[0].querySelector('.manse-current-result').hidden,false);
    assert.equal(sections[1].querySelector('.manse-current-result').hidden,true);
    sections[1].querySelector('.manse-current-button').click();
    assert.deepEqual(sections.map(s => s.querySelector('.manse-current-cycles').dataset.choice),['spring','autumn']);
    submit();assert.ok([...q('variants').querySelectorAll('.manse-current-result')].every(r => r.hidden));
    assert.deepEqual(errors,[]);
  } finally {Date.now=originalNow;cleanup();dom.window.close();}
});
