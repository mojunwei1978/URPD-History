# Bitcoin URPD: UTXO realized price distribution, every day since 2009

**Website: [BitcoinURPD.com](https://www.bitcoinurpd.com)**

The Bitcoin URPD (UTXO Realized Price Distribution) sorts every bitcoin by the price at which it last moved on-chain
and adds up the supply at each price. BitcoinURPD.com draws it for every day since 2009-01-03, each bar split into
short- and long-term holders (LTH/STH, at 150 days) or into 23 age bands, with the left axis fitted to each day's own
bars. It is a cost-basis distribution of the whole bitcoin supply: a tall bar is a price where a lot of supply last
moved, a gap is a price where almost none did, and the price box gives the share of the day's value (or coins) in
profit and in loss at the day's price. Data from Bitcoin Research Kit.

- **Scrub through history:** drag the orange dot along the price line, or use **← / →** (step size **1D / 1W / 1M /
  1Y**, keys **1** to **4**); see [Controls](#controls).
- **Explainer** in English, Chinese and Japanese: **?** in the toolbar.

## Reading it

- **Bottom axis** is the price each coin last moved at, not today’s price.
- **Left axis** is each bucket’s share of the day, in percent: of the realized cap (every coin’s value when it last moved, added up) in **% USD** mode, *Percent of USD Value Last Moved [%]*, and of all the coins in **% BTC** mode, *Percent of BTC Supply Last Moved [%]*. A day’s bars add up to 100%, so the same height is the same share on any day; the hover gives the amount behind each share. Both axes are marked at twenty equal steps from zero to their very end, labels rounded to two significant figures.
- **The price axis only grows.** It ends exactly at the highest price any coin had last moved at by the day you are viewing, moves only when the data goes past it, and never shrinks, so scrubbing back shows every day exactly as it looked at the time. BINS cuts it into 625 bars by default (50 to 1000), each exactly 1/625 of it (201.04 dollars on the 125,650 dollar axis of late 2025), whatever the smoothing, so a bar's height depends on the data and the bin count alone.
- **The left axis ends at the day’s own bars**, where the **Y-MAX** field says, as a percentile of the day’s bar heights, and nothing else moves it but **PIN Y-AXIS**. At 100, % USD mode’s default, the day’s tallest bar reaches the top, so every day’s shape fills the same frame. % BTC mode starts at 99.8: its first bar, the coins last moved for less than one bar’s width, is around ten times any other and runs off the top. Every bar the axis cuts is counted in the **▲** figure at the top left, the tallest one’s height and how many more, so no bar is cut without it showing.
- **Hover a bar** for its price, its age band (or holder group), the whole bar’s total (Total Value When Last Moved, or Total Supply) and Percent of Total, the running share of the day at or below that price.
- **White line** is bitcoin’s own price on its own hidden axes: a year of time around the selected day, and linear from $0 to the highest close shown so far, so the line fills the chart and only rescales on a new high.
- **Dashed vertical** is the spot price. Supply to its left last moved below it, supply to its right above it. It and the price box turn yellow when the **bottom signal** is on: at least the threshold set in the toolbar of the day in loss (80% of the value in % USD mode, 50% of the coins in % BTC mode by default).
- **Colour** is age: yellow is fresh, deep blue is ancient, logarithmic in between. The 23 colours lie on one path through OKLCH, evenly spaced to the eye, with lightness falling from young to old so the order survives greyscale, and every band at least 3:1 against the background.
- **LTH/STH**, the default, adds the same bands up into two at 150 days: short-term holders (STH, amber), the coins that moved within the last 150 days, under long-term holders (LTH, blue), the coins unmoved for 150 days or more. 150 days is Bitcoin Research Kit’s line between the two (Glassnode draws it at 155). The bars and axes are the same as in AGE; only the colours change.

Press **?** (How to read this chart) in the toolbar for the full explainer, in English, Chinese or Japanese.

## Controls

Mouse: drag the orange dot along the white price line to any day.

Keyboard:

- **A / D** or **← / →** — previous / next date
- **1 / 2 / 3 / 4** — step interval: 1D / 1W / 1M / 1Y
- **W / S** or **↑ / ↓** — step interval up / down, one size at a time (1D → 1W → 1M → 1Y, and round again)
- **Home / End** — first / last date

% USD / % BTC and LTH/STH / AGE are switched with their toolbar buttons.

Toolbar, left to right:

- Interval, date navigation, and a **CYCLE TOP/BTM** dropdown for cycle tops and bottoms
- **% USD / % BTC** — weight by dollar value at last move, or by coins, each bar drawn as its share of the day
- **LTH/STH / AGE** — split each bar into short- and long-term holders at 150 days (the default), or colour it by its 23 age bands
- **PIN Y-AXIS** — freeze the left axis where it is on the day you are viewing so other days can be compared against it; the Y-max field is off while it holds
- **Bottom signal** — the share of the day in loss (value in % USD mode, 80% by default; coins in % BTC mode, 50%) at which the dashed line and the price box turn yellow and the box adds a line naming the threshold
- **Bins**, **Smoothing** and **Y-max** — bins, how many equal-width bars the price axis is cut into up to the highest price so far (625 by default, 50 to 1000), with one more past it that takes in what the smoothing spreads beyond it, and each bar's width in dollars on the day shown after the count (BINS 625 $201); smoothing, which spreads each price stamp back over the dollar (ten dollars above $100K) it was rounded from and blurs it with a Gaussian of 0.24% of price by default; and Y-max, the percentile of the day’s bar heights where the left axis ends (100 in % USD mode, 99.8 in % BTC mode, each kept as you type it)
- **Click and drag** across the chart — mark a range of prices (whole columns); the mark stays as you move through the days and switch modes until a double-click or Escape clears it, and gives the share of the day that last moved inside it (of the value in % USD, of the coins in % BTC) and, in LTH/STH, the most days until every coin there is a long-term holder
- together at the right-hand end: **?** for the explainer and the GitHub mark for the source, as icons, and the language toggle

The toolbar is always one row and never scrolls. Where the controls do not fit the window, its spacing tightens, then
its type goes a size down, and past that the whole bar is drawn smaller, every word kept.

On a phone the toolbar is hidden to give the chart the whole screen. Tap the left or
right quarter of the screen to step back or forward a day, or drag the orange dot along
the price line; the chart itself does not pan or zoom.

## How it works

One HTML file, no build step, no dependencies to install. Charts render with
[Plotly.js](https://plotly.com/javascript/) from a CDN with an SRI hash. Data is
fetched per day from the Bitcoin Research Kit API mirrored at
[bitview.space](https://bitview.space), one request per age cohort
(`/api/series/cost-basis/<cohort>/<date>`). Loaded days are cached in memory, so
scrubbing backwards is instant.

The site offers no file to download, so that a break-in could not use it to hand anyone a file.

The price axis needs the whole history to be a function of the date alone, which no single
day’s download contains, so `data/scales.json` (about 5 KB) carries it: for every day
since 2009-01-03, the right end of the price axis, as steps. `tools/build-scales.cjs` builds it with the page’s own binning code;
run again, it extends the file by each finished day (23 requests to bitview.space per
day). The Days after the file’s last day still
draw, carrying on from its last values with their own data.

To deploy: push to GitHub and enable Pages on `main` at the repository root. That is
the whole deployment.

## Security

The site never asks you to install anything, connect a wallet or enter a seed phrase, and it offers no file to
download: the chart's camera icon only saves a PNG of the chart, made in your browser. [SECURITY.md](SECURITY.md) explains how the page and the build are protected, and how to report a
problem.

## Development checks

The site still deploys directly from the single HTML file with no build step.
Run the regression tests with Node.js 24 or newer:

```sh
node --test tests/*.test.cjs
```

The tests execute the application source with controlled network and rendering
interfaces. They cover navigation races, date and value calculations, binning and the
axes, render completion, the axis-history builder and the security
rules (`tests/security.test.cjs`). GitHub Actions runs the same checks on pushes and
pull requests. After editing an inline script in `index.html`, run
`node tools/update-csp.cjs` so the Content-Security-Policy allows the new version.

## Credits

- **URPD** — introduced by [Renato Shirakashi](https://x.com/renato_shira) in April 2020, popularised and extended by [James Check](https://x.com/_checkmatey_)
- **Data** — [Bitcoin Research Kit](https://github.com/bitcoinresearchkit/mono) by [@_nym21_](https://x.com/_nym21_), served via [bitview.space](https://bitview.space), built on [Bitcoin Core](https://bitcoin.org)
- **Charting** — [Plotly.js](https://plotly.com/javascript/) (MIT)

## Licence

MIT. See [LICENSE](LICENSE).
