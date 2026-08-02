# Tabata PWA — Design

Date: 2026-08-02

## Goal

A dead-simple interval (Tabata) timer that runs on an iPhone 12. The user
configures a workout with as few taps/typing as possible and runs it. It must
be installable to the home screen and work offline.

## Configurable parameters (per workout preset)

- **countdown** — "Get Ready" seconds before the workout starts
- **workSec** — length of one work interval
- **reps** — number of intervals per set
- **restSec** — pause between intervals within a set
- **sets** — how many times all intervals repeat
- **setRestSec** — pause between sets

## Decisions

- **Delivery:** PWA, installable via Safari "Add to Home Screen". Fullscreen
  (standalone), portrait, offline-capable.
- **Hosting:** GitHub Pages (free permanent HTTPS URL).
- **Cues:** Beeps only (Web Audio generated tones — no sound files).
- **Persistence:** Multiple named presets in `localStorage`; last-run preset
  remembered.
- **Stack:** Vanilla HTML/CSS/JS, no build step (keeps hosting + offline
  trivial and the codebase small).

## Non-goals (YAGNI)

No accounts, no cloud sync, no workout history/stats, no framework.

## Files

- `index.html` — single page, three views toggled by JS
- `styles.css`
- `app.js` — state, storage, timer engine, audio, wake lock
- `manifest.webmanifest`
- `sw.js` — offline asset cache
- `icons/` — 180/192/512 PNG app icons
- `docs/superpowers/specs/` — this spec

## Data model

```js
Preset = { id, name, countdown, workSec, reps, restSec, sets, setRestSec }
```

Stored as a JSON array under `localStorage["tabata.presets"]`.
Last-run id under `localStorage["tabata.lastId"]`.

## Screens

1. **Home** — large-tap list of saved presets. Tap a preset → Run screen,
   preloaded (one more tap to start). `＋ New` button; edit/delete per preset.
2. **Editor** — name field + 6 large `−/＋` steppers for the parameters. Save.
3. **Run** — huge phase label (Get Ready / Work / Rest / Set Rest / Done),
   giant countdown number, `Rep x/y · Set x/y` progress, phase color
   (green work / amber rest / blue set-rest). Pause · Resume · Stop.

## Workout timeline (no trailing rest)

```
Get Ready (countdown)
for set in 1..sets:
    for rep in 1..reps:
        Work (workSec)
        if rep < reps: Rest (restSec)
    if set < sets: Set Rest (setRestSec)
Done
```

## Timer engine

Drift-free: each phase stores an absolute end timestamp (`performance.now`
based). A ~100ms ticker computes remaining time from the timestamp and advances
to the next phase when it reaches zero. Pause records remaining time; resume
recomputes the end timestamp. This avoids the accumulating error of
decrement-a-counter timers.

## Audio cues

Web Audio API oscillator tones, unlocked on the Start tap (iOS requires a user
gesture to start an AudioContext):

- 3 short beeps during the final 3 seconds of every phase
- high tone entering Work
- low tone entering Rest / Set Rest
- triple tone at Done

## Screen wake

Screen Wake Lock API keeps the display on while a workout runs; released on
stop/finish/pause and re-acquired on resume and on visibility regain.

## Offline / PWA

`manifest.webmanifest`: standalone display, portrait, theme/background colors,
icons. `sw.js` precaches all assets on install and serves cache-first so the
app runs with no network after first load.
