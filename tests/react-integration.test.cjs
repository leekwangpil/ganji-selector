const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { hydrateRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { ManseCalculator } = require('../src/components/manse/ManseCalculator');

test('React hydration and StrictMode preserve calculation, exclusive choices and reset behavior', async () => {
  const element = React.createElement(React.StrictMode, null, React.createElement(ManseCalculator));
  const dom = new JSDOM('<div id="test-root">' + renderToString(element) + '</div>', { pretendToBeVisual: true });
  const previous = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const errors = [];
  let root;
  try {
    const d = dom.window.document;
    const q = id => d.getElementById('wm-' + id);
    assert.equal(q('submit').disabled, true, 'Calculation waits for initialization');
    await React.act(async () => {
      root = hydrateRoot(d.getElementById('test-root'), element, { onRecoverableError: error => errors.push(error.message) });
    });
    assert.equal(q('submit').disabled, false);
    const event = (el, type) => el.dispatchEvent(new dom.window.Event(type, { bubbles: true, cancelable: true }));
    const fill = (id, value, type = 'input') => { q(id).value = value; event(q(id), type); };
    const submit = () => { event(q('form'), 'submit'); assert.equal(q('error').hidden, true, q('error').textContent); };
    const choices = () => [...q('variants').querySelectorAll('.manse-cycle-choice')];
    const checked = group => [...group.querySelectorAll('input:checked')].map(input => input.value);
    for (const [id, value] of [['year', '2026'], ['month', '2'], ['day', '9'], ['hour', '12'], ['minute', '00']]) fill(id, value);
    for (const [id, value] of [['zone', 'korea'], ['clock', 'standard'], ['boundary', 'midnight']]) fill(id, value, 'change');
    d.querySelector('input[name=gender][value="남자"]').click();
    submit();
    let group = choices()[0];
    assert.equal(group.querySelector('legend').textContent, '갑인년이');
    assert.deepEqual(checked(group), []);
    const table = q('variants').querySelector('table');
    for (const value of ['spring', 'autumn', 'undecided', 'spring']) {
      group.querySelector('input[value="' + value + '"]').labels[0].click();
      assert.deepEqual(checked(group), [value]);
      assert.equal(q('variants').querySelector('table'), table);
      assert.equal(q('status').textContent, '계산 완료');
    }
    fill('month', '9'); fill('day', '13'); fill('boundary', 'zi23', 'change'); q('unknown').click();
    assert.equal(choices().length, 0);
    submit();
    assert.deepEqual(choices().map(g => g.dataset.anchor), ['경술', '신유']);
    const [first, second] = choices();
    first.querySelector('input[value=autumn]').click();
    second.querySelector('input[value=undecided]').click();
    assert.deepEqual(checked(first), ['autumn']); assert.deepEqual(checked(second), ['undecided']);
    fill('day', '14'); submit();
    assert.ok(choices().every(g => checked(g).length === 0));
    assert.deepEqual(errors, []);
    await React.act(async () => root.unmount());
    root = null;
  } finally {
    if (root) await React.act(async () => root.unmount());
    dom.window.close();
    global.window = previous.window; global.document = previous.document;
    global.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});
