const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM, VirtualConsole } = require('jsdom');
const { CalculatorMarkup } = require('../src/components/manse/CalculatorMarkup');
const { mountManseCalculator } = require('../src/components/manse/controller');

function createCalculatorDom(options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  // Exercise the actual React markup and production controller, without a browser.
  const markup = renderToStaticMarkup(React.createElement('div', {
    id: 'manse-calculator'
  }, React.createElement(CalculatorMarkup)));
  const dom = new JSDOM(markup, { virtualConsole, pretendToBeVisual: true, url:options.url });
  options.beforeMount?.(dom.window);
  const cleanup = mountManseCalculator(dom.window.document.getElementById('manse-calculator'));
  return { dom, errors, cleanup };
}

module.exports = { createCalculatorDom };
