# Aureum — MGC Trading Bias Journal

A public static React app for journaling Micro Gold (MGC) bias. Journal entries stay private in each browser's localStorage; there is no server or account for journal data.

- **Live app:** https://shubhamx939.github.io/mgc-trading-bias-journal/
- **GitHub repository:** https://github.com/shubhamx939/mgc-trading-bias-journal
- **GitHub account:** [shubhamx939](https://github.com/shubhamx939)

## Run locally

```bash
git clone https://github.com/shubhamx939/mgc-trading-bias-journal.git
cd mgc-trading-bias-journal
npm ci
npm run dev
```

Run `npm test`, `npm run lint`, and `npm run build` to verify the project. The static build is written to `dist/`.

## Project structure

```text
src/
  App.jsx             Journal, analytics, history, review and erase dialogs, alerts UI
  components/AccuracyChart.jsx  Lazily loaded Recharts view
  index.css           Tailwind import and dark terminal styling
  hooks/useJournal.js React reducer and localStorage persistence
  lib/journal.js      Journal reducer, scoring, CSV export, erase helper
  lib/schedule.js     OANDA XAUUSD candle windows in Asia/Kolkata, weekday navigation
  lib/alerts.js       Browser notification and audio chime helpers
.github/workflows/deploy.yml  GitHub Pages build and deployment
vite.config.js        Relative asset base for GitHub Pages
```

## Journal behavior

- Morning and EOD choices are stored separately for 12M, 6M, 3M, 1M, 1W, and 1D.
- The journal uses **Asia/Kolkata (IST)** dates and offers **Monday through Friday** only. Previous/next navigation skips weekends, and Monday's previous-day review uses Friday.
- Intraday windows follow the OANDA:XAUUSD chart in TradingView with the chart timezone set to Asia/Kolkata. 1H candles start on the half-hour. 4H candles use OANDA's 17:00 New York daily alignment: during US daylight saving time their IST starts are 02:30, 06:30, 10:30, 14:30, 18:30, and 22:30; during US standard time they start at 03:30, 07:30, 11:30, 15:30, 19:30, and 23:30. The app applies the seasonal shift automatically. Hours without an OANDA gold session are omitted from the 1H list; all six 4H slots remain available.
- The current 1H candle moves to the top of the hourly log when the selected date is today and the gold market is open. On wider screens the HTF and intraday panels sit side by side, as do the two analytics panels.
- An accuracy score counts only pairs with both a forecast and an actual result. Neutral is a valid choice and must match neutral to count as correct.
- The previous trading day's review opens once on the next weekday if that day has a journal record. Incomplete EOD entries display as pending.
- While the page is open, it checks for new chart-aligned candles every 10 seconds. A new 1H window shows an in-app reminder; a coincident 4H window mentions both. Reminders pause during OANDA's daily break and weekend. Sound can be enabled with the speaker button. System notifications require browser permission and HTTPS (GitHub Pages provides HTTPS). Browser sleep, a closed tab, or operating system restrictions may delay or prevent reminders.
- **Historical Logs → Export CSV** downloads a backup. Browser data is device and browser specific.
- **Historical Logs → Erase data** opens a confirmation dialog requiring `ERASE`. It removes this app's journal entries, review flags, and sound preference from the current browser. It does not delete unrelated localStorage keys or data in another browser or device. Download a CSV first if you want a backup.

## GitHub Pages deployment

The site is already deployed from [`shubhamx939/mgc-trading-bias-journal`](https://github.com/shubhamx939/mgc-trading-bias-journal) to https://shubhamx939.github.io/mgc-trading-bias-journal/. GitHub Pages is configured to use GitHub Actions in the [repository Pages settings](https://github.com/shubhamx939/mgc-trading-bias-journal/settings/pages).

To publish later changes, push `main`:

```bash
git add .
git commit -m "Update MGC bias journal"
git push origin main
```

The included workflow runs the tests, lint check, and production build before deployment. [View workflow runs](https://github.com/shubhamx939/mgc-trading-bias-journal/actions/workflows/deploy.yml).

`vite.config.js` uses `base: './'`, so assets load under `https://shubhamx939.github.io/mgc-trading-bias-journal/`. Navigation is internal React state, so it needs no route rewrite rule.
