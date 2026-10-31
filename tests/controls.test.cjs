// The toolbar's controls: the date box, the step sizes, the settings fields, pins, the videos menu and the
// languages (the two Y-MAX buttons: ymax-modes.test.cjs). Each test here pins down a bug the 2026-09-24 audit found.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { html, scripts, app, flush } = require('./helpers.cjs');

const plain = v => JSON.parse(JSON.stringify(v));   // out of the page's realm, for deepEqual
// The page's stylesheet, comments stripped, as rules; decls(sel) is every declaration given to exactly that selector.
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const rules = css.split('}').map(r => r.split('{')).filter(r => r.length === 2)
  .map(([sel, body]) => ({ sels: sel.split(',').map(x => x.trim().replace(/\s+/g, ' ')), body: body.trim() }));
const decls = sel => {
  const found = rules.filter(r => r.sels.includes(sel));
  assert.ok(found.length, 'no rule for ' + sel);
  return found.map(r => r.body).join('; ');
};
const props = sel => Object.fromEntries(decls(sel).split(';').map(d => d.split(':')).filter(p => p.length > 1)
  .map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
const main = scripts.find(s => s.includes('var BASE ='));
function section(start, end) {
  const a = main.indexOf(start), b = main.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing ${start} .. ${end}`);
  return main.slice(a, b);
}
function days(from, to) {
  const out = [];
  for (let t = Date.parse(from + 'T00:00:00Z'); t <= Date.parse(to + 'T00:00:00Z'); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
// The app with its date list, drawing stubbed out: navigation only records where it was sent.
function navApp(dates) {
  const h = app(), loads = [];
  h.c.allDates = dates;
  h.c.loadAndRender = () => { loads.push(h.c.allDates[h.c.currentIdx]); h.c.lastRenderedData = { dateStr: h.c.allDates[h.c.currentIdx] }; return Promise.resolve(); };
  return Object.assign(h, { loads });
}

test('1W, 1M and 1Y are calendar steps, and never skip a listed day or stall on a gap', () => {
  const dates = ['2009-01-03', '2009-01-09', '2009-01-10', '2009-01-11'].concat(days('2009-01-12', '2011-03-31'));
  const h = navApp(dates), { c } = h;
  const at = d => dates.indexOf(d), step = (from, dir) => dates[Math.max(0, Math.min(dates.length - 1, c.stepTarget(at(from), dir)))];
  c.setInterval1(2);   // 1M
  assert.equal(step('2010-01-31', 1), '2010-02-28', 'February is not skipped');
  assert.equal(step('2010-03-31', -1), '2010-02-28');
  assert.equal(step('2010-02-28', 1), '2010-03-28');
  c.setInterval1(3);   // 1Y
  assert.equal(step('2009-01-03', 1), '2010-01-03', 'a year from the first day, across the gap in early 2009');
  assert.equal(step('2010-06-15', -1), '2009-06-15');
  assert.equal(step('2009-01-09', -1), '2009-01-03', 'before the history starts: its first day');
  c.setInterval1(1);   // 1W
  assert.equal(step('2009-01-03', 1), '2009-01-10', 'the first listed day on or after a week on');
  assert.equal(step('2009-01-12', -1), '2009-01-03', 'the last listed day on or before a week back');
  c.setInterval1(0);   // 1D: the next listed day
  assert.equal(step('2009-01-03', 1), '2009-01-09');
});

test('prefetch fetches the next steps of the selected size, not the neighbouring days', async () => {
  const dates = days('2022-01-01', '2026-09-20');
  const h = navApp(dates), { c } = h, fetched = [];
  vm.runInContext(section('var PREFETCH_AHEAD = 2;', 'function loadAndRender('), c);
  c.fetchRaw = d => { fetched.push(d); return Promise.resolve({}); };
  c.setInterval1(3);
  c.currentIdx = dates.indexOf('2026-09-20');
  c.prefetchPrev = dates.indexOf('2026-09-20') + 1;   // walking back
  c.schedulePrefetch();
  h.runTimer([...h.timers.keys()].at(-1));
  await flush();
  assert.deepEqual(fetched, ['2025-09-20', '2024-09-20']);
});

test('a failed first draw can be retried with the same key, and an already drawn day is not reloaded', () => {
  const h = navApp(days('2026-09-01', '2026-09-10')), { c } = h;
  c.currentIdx = 9; c.lastRenderedData = null;
  c.goTo(9);
  assert.equal(h.loads.length, 1, 'nothing on screen yet: pressing End again retries');
  c.goTo(9);
  assert.equal(h.loads.length, 1, 'now it is drawn: nothing to do');
});

test('Up and Down, or W and S, change the step size one at a time, round and round; the weighting stays as it is', () => {
  const { c, docListeners } = app();
  const press = (key, extra = {}) => { let prevented = false; docListeners.keydown[0]({ key, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...extra }); return prevented; };
  const up = [], down = [];
  for (const k of ['ArrowUp', 'w', 'W', 'ArrowUp']) { assert.ok(press(k), k); up.push(c.stepIdx); }
  assert.deepEqual(up, [1, 2, 3, 0], '1W, 1M, 1Y, then 1D again');
  for (const k of ['ArrowDown', 's', 'S', 'ArrowDown']) { assert.ok(press(k), k); down.push(c.stepIdx); }
  assert.deepEqual(down, [3, 2, 1, 0], '1Y, 1M, 1W, 1D');
  assert.equal(c.coinMode, false, 'USD/BTC is left to its buttons');
  assert.equal(c.viewIdx, 0);
  assert.equal(c.yMaxPct, 100, 'and the Y-max to its field (100 in USD)');
  // The browser keeps its own shortcuts (Ctrl+S saves the page).
  assert.equal(press('s', { ctrlKey: true }), false);
  assert.equal(c.stepIdx, 0);
});

test('the settings fields take a number and nothing else', () => {
  const { c } = app();
  const cases = { '1,000': NaN, '1e3': 1000, '400abc': NaN, ' 625 ': 625, '６２５': 625, '': NaN, '0.24': 0.24, '-': NaN };
  for (const [typed, want] of Object.entries(cases)) assert.ok(Object.is(c.fieldNumber(typed), want), typed);
});

test('a pin is kept per weighting, bin count and smoothing, and PIN Y-AXIS does nothing before the first chart', () => {
  const { c, element } = app();
  c.coinMode = true;
  assert.equal(c.peakKey({ numBins: 625, kernelPct: 0 }), 'btc%|b625|s0');
  c.coinMode = false;
  assert.equal(c.peakKey({ numBins: 400, kernelPct: 0.24 }), 'usd%|b400|s0.24');
  c.lastRenderedData = null;
  c.peakStore = { 'usd%|b625|s0.24': ['2026-01-01', 5] };
  element('btnPeak').onclick();
  assert.deepEqual(plain(c.peakStore), { 'usd%|b625|s0.24': ['2026-01-01', 5] }, 'a saved pin is not deleted');
});

test('every text has all three languages', () => {
  const { c } = app();
  const langs = ['en', 'zh', 'ja'], keys = new Set(langs.flatMap(l => Object.keys(c.T[l])));
  for (const l of langs) for (const k of keys) assert.ok(typeof c.T[l][k] === 'string' && c.T[l][k].length, `${l}.${k}`);
});

test('there is no download button, and the bar is drawn like the favicon: black and white, square, the chosen option inverted', () => {
  assert.doesNotMatch(html, /id="videoBtn"|#videoBtn/, 'no video download (security.test.cjs checks every link)');
  // The bar is the greyish black it always had (#1a1a1a), drawn in black and white on it.
  assert.match(decls('#controls'), /background:\s*#1a1a1a;/);
  // Every button and link: the bar's grey, a 1px outline of white at 35% (#595959), solid white under the mouse,
  // square corners; the chosen option is a white block with black text.
  for (const sel of ['#controls button', '#controls #githubLink']) {
    assert.match(decls(sel), /background:\s*#1a1a1a;\s*color:\s*#fff;\s*border:\s*1px solid #595959;\s*border-radius:\s*0;/, sel);
  }
  for (const sel of ['#controls button:hover', '#controls #githubLink:hover', '#explainBtn:hover', '#langBtn:hover']) {
    assert.match(decls(sel), /border-color:\s*#fff/, sel);
  }
  assert.match(decls('#controls .mode-toggle button.active'), /background:\s*#fff;\s*color:\s*#000;\s*border-color:\s*#fff/);
  assert.match(decls('#intervalBar .iv.active'), /background:\s*#fff;\s*color:\s*#000/);
  // The step bar and the cycle list are framed the same way; the list's frame doubles while it has focus.
  assert.match(decls('#intervalBar'), /border:\s*1px solid #595959;\s*border-radius:\s*0/);
  assert.match(decls('#landmarks'), /background:\s*#1a1a1a;.*border:\s*1px solid #595959;.*border-radius:\s*0/);
  assert.match(decls('#landmarks:hover'), /border-color:\s*#fff/);
  assert.match(decls('#landmarks:focus'), /border-color:\s*#fff;\s*box-shadow:\s*inset 0 0 0 1px #fff/);
  // Nothing in the bar is orange, lighter grey or rounded any more.
  const bar = rules.filter(r => r.sels.some(x => /^(#controls|#intervalBar|#landmarks|#dateDisplay|\.yt-|#githubLink|#explainBtn|#langBtn|\.ctrl-sep|\.mode-toggle)/.test(x)));
  for (const r of bar) assert.doesNotMatch(r.body, /#ff8c00|#ffaa33|#3a3a3a|#252525|#1e1e1e|#d4d4d4|#555\b|#888|border-radius:\s*[1-9]/, r.sels.join(','));
  // The favicon stays the tab's icon only: no mark in the bar, which starts with the step sizes.
  assert.match(html, /<div id="controls">\s*<div id="intervalBar">/);
  assert.doesNotMatch(html, /brandMark/);
  // Keyboard focus: the browser's ring on buttons, a white ring on the links. (A mouse click lets go of focus, so
  // none of this is ever drawn for the mouse; see ui.test.cjs.)
  assert.ok(!rules.some(r => r.sels.some(x => /^#controls (button|a|select):focus$/.test(x))), 'focus rings are not switched off');
  for (const sel of ['#githubLink:focus-visible']) assert.match(decls(sel), /outline:\s*2px solid #fff/, sel);
  assert.equal(rules.filter(r => /background-color:\s*#(4a4a4a|ffc266)/.test(r.body)).length, 0, 'no focus fills');
});

test('the day counter looks like the cycle list: same frame, grey text, normal weight, and a box that holds still', async () => {
  const counter = props('#dateDisplay'), list = props('#landmarks');
  for (const k of ['background', 'color', 'border', 'border-radius']) assert.equal(counter[k], list[k], k);
  assert.equal(counter['font-weight'], 'normal');
  assert.equal(counter.height, '24px', 'as tall as the list and the buttons');
  assert.match(decls('#controls #dateDisplay'), /font-size:\s*12px/);
  assert.ok(!rules.some(r => r.sels.some(x => /#dateDisplay:hover/.test(x))), 'no hover state: it is not a control');
  // N/N is 2 × digits + 1 characters of a monospace font, and 18px is its padding and border (0 8px, 1px).
  assert.match(counter.padding, /^0 8px$/);
  for (const [n, width] of [[3, 'calc(3ch + 18px)'], [150, 'calc(7ch + 18px)'], [6469, 'calc(9ch + 18px)']]) {
    const h = app(), dates = days('2009-01-03', '2030-01-01').slice(0, n);
    h.c.fetchJSON = url => Promise.resolve(url.endsWith('/all/dates') ? dates : null);
    h.c.loadAndRender = () => Promise.resolve();
    await h.c.init();
    assert.equal(h.element('dateDisplay').style.minWidth, width, n + ' days');
  }
});

test('LTH/STH | AGE sits right of USD/BTC, LTH/STH on first; switching only draws the day on screen again, and a rolled-back change puts it back', () => {
  const { c, element } = app();
  const bar = html.slice(html.indexOf('<div id="controls"'), html.indexOf('<div id="toolbarEnd"'));
  const usd = bar.indexOf('id="btnBTC"'), split = bar.indexOf('id="btnSplit"'), age = bar.indexOf('id="btnAge"'), pin = bar.indexOf('id="btnPeak"');
  assert.ok(usd < split && split < age && age < pin, 'USD BTC | LTH/STH AGE | PIN Y-AXIS');
  assert.match(bar, /<button id="btnSplit" class="active" aria-pressed="true" title="[^"]+">LTH\/STH<\/button>/);
  assert.match(bar, /<button id="btnAge" aria-pressed="false" title="[^"]+">AGE<\/button>/);
  assert.equal(c.splitMode, true, 'LTH/STH by default');
  let redraws = 0, loads = 0;
  c.rerenderCurrent = () => { redraws++; };
  c.loadAndRender = () => { loads++; return Promise.resolve(); };
  element('btnAge').onclick();
  assert.equal(c.splitMode, false);
  assert.deepEqual([element('btnSplit').getAttribute('aria-pressed'), element('btnAge').getAttribute('aria-pressed')], ['false', 'true']);
  element('btnAge').onclick();
  assert.equal(redraws, 1, 'choosing the colouring already on does nothing');
  assert.equal(loads, 0, 'the same bars: nothing is fetched or binned again');
  const saved = c.captureChartSettings();
  element('btnSplit').onclick();
  assert.deepEqual([c.splitMode, redraws], [true, 2]);
  c.restoreChartSettings(saved); c.syncControls();
  assert.equal(c.splitMode, false, 'a change that could not be drawn is rolled back with the rest');
  assert.equal(element('btnAge').getAttribute('aria-pressed'), 'true');
  // In every language the switch reads as it should, with its tooltip.
  for (const [lang, ageW, splitW] of [['en', 'AGE', 'LTH/STH'], ['zh', '年龄', '长/短期'], ['ja', '年齢', '長期/短期']]) {
    c.lang = lang; c.applyLang();
    assert.deepEqual([element('btnAge').textContent, element('btnSplit').textContent], [ageW, splitW], lang);
    assert.match(element('btnSplit').title, /150/, lang);
  }
  assert.match(c.T.en.splitTitle, /short-term holders \(STH[^)]*\) and long-term holders \(LTH/);
  assert.deepEqual([c.T.en.sth, c.T.en.lth], ['Short-Term Holders (STH)', 'Long-Term Holders (LTH)']);
  assert.doesNotMatch(JSON.stringify(c.T), /150D/, 'named LTH and STH, not by days');
});

test('BINS takes 50 to 1000 bars and draws the day again with them; anything else leaves it as it was', () => {
  const { c, element } = app();
  let draws = 0;
  c.loadAndRender = () => { draws++; return Promise.resolve(); };
  assert.equal(c.NUM_BINS, 625, '625 by default, the same as the videos');
  for (const bad of [49, 1001, NaN, 625]) { c.applyBins(bad); assert.equal(c.NUM_BINS, 625, String(bad)); }
  assert.equal(draws, 0);
  c.applyBins(400);
  assert.deepEqual([c.NUM_BINS, draws], [400, 1]);
  // Typed into the field: a number and nothing else, held to 50-1000 when it is committed.
  const input = element('binsInput');
  input.emit('change', { target: Object.assign(input, { value: '5000' }) });
  assert.deepEqual([input.value, c.NUM_BINS], ['1000', 1000]);
  input.emit('change', { target: Object.assign(input, { value: 'abc' }) });
  assert.deepEqual([input.value, c.NUM_BINS], ['1000', 1000], 'not a number: the field shows the bins in force');
  assert.equal(c.peakKey({ numBins: 1000, kernelPct: 0.24 }), 'usd%|b1000|s0.24', 'a pin is kept per bin count');
  c.NUM_BINS = 300; c.syncSettingFields();
  assert.equal(element('binsInput').value, '300');
});
