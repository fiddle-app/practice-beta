233ef40 2026-06-01 fix: skip post-acquire applyConstraints on iOS ΓÇö it was undoing audio:true
f6fa1d5 2026-06-01 fix: platform-adaptive mic constraints + recording boost setting
cda90f5 2026-06-01 fix: apply +12dB software gain boost to recording path for instrument distance
da9b436 2026-06-01 fix: MediaRecorder MIME priority + 128kbps bitrate for clean instrument recording
e056049 2026-06-01 feat: plan phase screen, editor pill redesign, decimal time parsing, mic diagnostics
7713bd2 2026-06-01 chore: sync mic.js from _shared (disable voice-processing constraints)
bfc8c3e 2026-06-01 refactor: collapse random/random-no-repeat into single random order
e957097 2026-06-01 docs: add session log and code-review report for routines feature
937d3f4 2026-06-01 fix: code-review findings ΓÇö round-trip serializer + stale doc comment
006333f 2026-06-01 fix: routine polish ΓÇö textarea input, Rest format, layout, timer overrides
a6449c9 2026-06-01 fix: add new routine js files to sw.js PRECACHE
5c7c106 2026-06-01 feat: add practice routine system (branch: microbreaker-routines)
106e78b 2026-05-30 feat: add tip jar to info overlay
1c4158b 2026-05-30 chore: default vrBad to ["wrong"] only, drop "restart"
8829f7e 2026-05-30 ux: disable per-command voice toggles when master voice switch is off
3115cfa 2026-05-30 refactor: replace vrGood/vrBad list UI with two rows in command list
7523a0b 2026-05-30 feat: closing questions shown during rest phase
6940bb5 2026-05-30 feat: per-command voice control settings (toggle + custom triggers)
f9c989b 2026-05-30 ux: make entire Ready ring clickable as start button
d0221ea 2026-05-28 ux: reposition voice-model loading toast to top third of screen
e3647b2 2026-05-28 chore: add practice-beta deploy target, matching ear-tuner pattern
4cafb1f 2026-05-28 chore: sync design-tokens.css from _shared
c4bfb2b 2026-05-25 fix: tighten mic lifecycle ΓÇö suppress, stale-gen guard, release on last-consumer-off
495e670 2026-05-19 chore: sync design-tokens.css from _shared
979eafe 2026-05-19 Barry's backlog work
0ff732d 2026-05-18 ux: Info-overlay pauses timer; breaks count toward practice time by default
a3ea02e 2026-05-18 rep-counter: expand +/- tap zones to prevent stray rep-claims
77c1407 2026-05-18 settings: UI restructure, welcome copy, save/reset refactor
e718668 2026-05-15 PWA upgrade: cache-key defense-in-depth (mirror of ear-tuner d5c8148)
01054ed 2026-05-15 backlog: add B7..C13 from inbox sweep (7 items)
1c9072f 2026-05-14 pin Capacitor to exact 8.3.4 + resync platform/register-sw comments
60a2155 2026-05-14 Phase 1: skip Resume modal + upgrade modal on Capacitor iOS
2446e42 2026-05-14 log: 26-05-14 first iPhone deploy + icon/splash + follow-up plans
1c316cb 2026-05-14 ios: real icon + splash; personal-team signing; mic-string update
a3cd991 2026-05-14 review followups: cli to devDeps; fix dead CLAUDE.md link
eb9ef40 2026-05-14 docs: refresh CLAUDE.md + provisioning.md; add cap-wrap-notes
e36cb10 2026-05-14 scaffold: Capacitor iOS app (com.mullensoft.microbreaker)
1b3cd28 2026-05-14 cap-prep: adopt register-sw helper + close-btn cleanup
e418de6 2026-05-13 log: 26-05-13 Tier 1 resilience audit landings + iteration followups
367fbce 2026-05-13 copy: 'Voice Recognition' ΓåÆ 'Voice Control' (user-facing only)
9a3a324 2026-05-13 fix Hello-loop after upgrade-OK
064ce8c 2026-05-13 hello: match welcome-overlay layout ΓÇö drop justify-content:center
8e5e824 2026-05-13 hello: bluetooth-audio caveat note below the VR opt-in buttons
3c5ddc0 2026-05-13 sync dynamic audio-session-type + add appWantsMic resolver
f1bc4e0 2026-05-13 adopt shared diag-log.js ΓÇö replace per-app diag-log.js
2e4fd86 2026-05-13 sync audio-ctx cross-PWA session-loss fix from _shared
980710c 2026-05-13 sync audio-ctx doctrine header from _shared (doc-only)
8d057c3 2026-05-13 sync audio-ctx auto-resume fix from _shared
be8405e 2026-05-13 Tier 1 resilience lift from ear-tuner
de1bb9a 2026-05-13 consume shared resume-modal.css; drop inline copy
a471f42 2026-05-13 consume _shared mic + wakelock; split recording into mic-recording.js
d9723fd 2026-05-12 log: session close-out ΓÇö wake-lock commit + ear-tuner handover
7ccc14a 2026-05-12 backlog: add C8 multi-clip recording item (preserve audio across backgroundings)
4620305 2026-05-12 log: code-review polish pass for beep-storm fix + fix Hello-screen copy
c8cc35d 2026-05-12 review: address code-review findings on beep-storm fix
9ad221a 2026-05-12 wakelock: prevent screen auto-lock during active practice
5cbbe45 2026-05-12 mic: auto-release on persistent mute to kill iOS lock-screen beep storm
419c743 2026-05-09 upgrade: rename app in upgrade screen text; add session log
28fc227 2026-05-09 boot: reload page when new SW claims it (controllerchange handler)
9389c9e 2026-05-09 boot: nudge SW to check for updates on every launch
c2d3f79 2026-05-09 upgrade: full-screen layout, simpler text
7cc649b 2026-05-09 upgrade: fix placeholder-self-stamp bug in inline boot script
c6a95f8 2026-05-09 upgrade modal: gate OK for 1500ms, block openLaunchGate, log decision
cd7d2e7 2026-05-09 diag: show last-seen + meta build in Settings ΓåÆ App Version
57ef291 2026-05-09 boot: detect version skew and prompt the user to clear caches
da65e35 2026-05-09 welcome/hello: show build date at bottom; defensive (unknown) fallback
56eec88 2026-05-09 diag: add Refresh button to log panel
2838a87 2026-05-09 visibility: silent rebuild whenever no gesture is required (B6)
10fd320 2026-05-09 mic: drop record-start delay from 2000 ms to 500 ms
3c24bcf 2026-05-09 resume: call vcStart in then() block; diag log oldest-first
693b2b0 2026-05-09 backlog: add B6 (P1) ΓÇö silent vc rebuild on AudioWorklet zombie
85b5ce4 2026-05-09 voice/resume: heavy-rebuild path on vc-failure escalation
f7d70dc 2026-05-09 voice: gate auto-start to loadingΓåÆready; defensive null-recheck in vcStart
73aea99 2026-05-09 voice: detect zombied AudioWorklet and escalate to Resume
3d00c9f 2026-05-09 welcome/hello: drop silent-switch warning; add visibility-loss simulator
353599f 2026-05-09 visibility: probe-and-recover instead of preemptive nuke + Resume
faf04c2 2026-05-09 gate: hello survives pageshow; drop blur/focus from bg detection
bac0c71 2026-05-08 resume: validate cached mic stream via track.readyState; reuse if live
24b586c 2026-05-08 gate: don't releaseMic on background ΓÇö iOS plays mic-toggle sounds
d29b29a 2026-05-08 gate: multi-event background detection, mute master, diagnostic log
26d8955 2026-05-08 hello: per-session gate, not per-day (every page reload needs gesture)
887fd0f 2026-05-08 voice: don't warm up while launch overlay is open; auto-start on ready
a61bb98 2026-05-08 launch gate: Welcome two-button + daily Hello + Resume on visibility-restore
1064469 2026-05-08 review: Web Audio playback (no <audio> element); fix focus-change beeps
627d918 2026-05-08 sync audio-ctx: play-and-record session for iOS 18
6e48945 2026-05-08 harden: SW install, reload, recording memory; add max-rec setting
587200a 2026-05-08 voice: remove [bp] checkpoint markers (synced + app-local)
db53e17 2026-05-08 voice: Phase 2 productionized + Wipe-cache UX fix + hardening plan
92f8f07 2026-05-08 diag: capture console.log + bump ring to 500 + checkpoint markers
f606b54 2026-05-07 voice: Phase 1 memory refactor ΓÇö lazy script + setCommands + UI cleanup
efda807 2026-05-07 fix: defer Vosk model load from boot to welcome Get Started
3dd35b3 2026-05-07 fix: route all mic/audio init through welcome-gate gesture
aff4af6 2026-05-07 log: PWA crash recovery ΓÇö diag-log + watchdog + in-app test path
99e3f7b 2026-05-07 crash-recovery test buttons in Settings ΓåÆ Diagnostics
e0087fd 2026-05-07 watchdog: clean-shutdown marker + sim-crash test button
2122fff 2026-05-07 defensive: boot watchdog + #debug URL panel
74b5784 2026-05-07 voice + diag: 'start' Ready-only + persistent error log + copy
f79b9b7 2026-05-07 log: voice control suite ΓÇö iterations after 1817L closeout
a13464e 2026-05-06 voice control suite: warm-up on first gesture (fix 'start' on Ready)
105356b 2026-05-06 voice control suite: fix 'start' on initial Ready screen
f23db0d 2026-05-06 voice control suite: iteration 2 ΓÇö Casey's post-implementation feedback
9953c40 2026-05-06 voice control suite: code-review follow-ups
1f68664 2026-05-06 voice control suite: per-screen contexts, focus recovery, debug readout
32d1726 2026-05-06 voice control suite: file backlog items B4/C5/C6 + kickoff plan
13349bb 2026-05-05 Sync design-tokens.css from _shared
83922ce 2026-05-02 Settings: drop one-shot vrGood/vrBad seed-strip migration
372e226 2026-05-02 Settings: hide built-in synonyms; UI shows "additional" only
e908cbc 2026-05-02 Sync from _shared/: add --font-caption token
ca72d30 2026-05-02 research: capture 'Neuro PracticeBuddy' naming idea (from inbox)
99aa531 2026-05-02 Settings: user-customizable voice synonyms for good/bad
4015528 2026-04-30 specs: add welcome.md as editable source for welcome-screen copy
16d4176 2026-04-30 Welcome: replace "In the future" bullet with rep-counter intro
50b995c 2026-04-30 Bump --font-info-body by 1px (mirror _shared)
8fe84e1 2026-04-30 Add project-specific code-review rules (R-MICROBREAKER-1..6)
9ea842f 2026-04-30 Backlog: P1 ΓÇö run code-reviewer subagent and react to findings
47f17ac 2026-04-30 Migrate welcome/info to --font-info
72da681 2026-04-29 voice cache + repeats, settings X overlap, vocab; log
0619fe2 2026-04-29 Rename backlog references: media-markup -> timeliner
4669b04 2026-04-29 Wire voice commands into rep counter (Vosk-browser, on-device)
b1ea7d6 2026-04-28 B2: defer recording start past round-start bell; backlog adds (B2, H2); log
04e8cf9 2026-04-28 Resync sprite: bare play/pause icons (no circle)
6792342 2026-04-28 P14: predev ΓåÆ _shared/sync.sh; strip stale local-copy headers + heal audio-ctx drift
b0c1f70 2026-04-28 Close H1 (promote shared glyphs/chime to _shared)
53da434 2026-04-28 refactor: rename rc-dot-circle.* ΓåÆ prog-circle.*, consume _shared glyphs and chime
a73a383 2026-04-28 Expand H1 scope: add CSS dome-wrapper parallel-rules to shared-promotion work
bde7438 2026-04-28 feat(soft-dome): apply across working-screen controls
5d1a207 2026-04-28 Backlog: add and close C3 (PWA stale-build fix)
763d207 2026-04-28 fix(pwa): auto-update SW on launch + cache-aware Reload
6371305 2026-04-28 chore(log): inbox sweep ΓÇö rep-counter hit areas, audio -20%, congrats z-order
68ad2b5 2026-04-28 fix(microbreaker): rep-counter hit areas, audio -20%, congrats z-order
2d54b3a 2026-04-28 chore(log): add session log for review-btn waveform fix
95c91b1 2026-04-28 fix(review-btn): white waveform bars on micro-break bg (B1)
0a2a35d 2026-04-28 feat(rep-counter): slide-to-left animation + audio cues + global caret rule
3c758f9 2026-04-28 fix(rep-counter): visual refinements + bug fixes + pause-icon ID collision
0902ad5 2026-04-27 feat: add repetition counter to practice screen
6057cd3 2026-04-25 fix(ui): hide corner buttons over settings/info overlays
41fae71 2026-04-25 fix(dev): auto-unregister SW on localhost; modern PWA meta tag
7f14151 2026-04-24 backlog: close B1 (settings close-button pattern adopted)
5f53356 2026-04-24 style: pill treatment on #s-done-btn (B1 close-out)
182b01b 2026-04-24 refactor(icons): migrate sym-* refs to icon-*; drop legacy sprite
1d892b4 2026-04-24 fix(dev): eliminate /practice/ and /favicon.ico 404s in local http-server
73a396e 2026-04-24 feat(icons): adopt shared sprite pipeline via #icon-* use refs
da7d0e0 2026-04-24 added log file
adf2fd3 2026-04-24 design-tokens: sync from _shared (--color-green-light update)
214d974 2026-04-24 chore: sync shared tokens; add backlog B1 (settings close-button adoption)
46e1133 2026-04-23 fix: use real PNG for apple-touch-icon (iOS Add to Home Screen)
85a2719 2026-04-21 refactor: use shared SVG sprite for transport icons
c0df90d 2026-04-21 refactor: split design-tokens.css; add design-tokens-app.css; link both in index.html
c4933a1 2026-04-21 refactor: replace inline bg-fill blocks with setBg() from shared safe-area.js
7bfc211 2026-04-21 refactor: expand design token set; wire new tokens in style.css
646a6d3 2026-04-21 refactor: extract shared design tokens into design-tokens.css
81a0eb3 2026-04-20 chore: sync audio-ctx.js from _shared (sfInstruments cleanup + BFCache reset)
da6f90c 2026-04-20 chore: restore %%BUILD_DATE%% placeholder
65c18d5 2026-04-20 chore: stamp BUILD_DATE 2026-04-21 02:00
fbf3ea8 2026-04-20 fix: reformat review hint text to 3 lines
741177b 2026-04-20 docs: add session logs and remove refactor prompt (moved to ear-tuner)
040a48c 2026-04-20 chore: restore %%BUILD_DATE%% placeholder
57c3100 2026-04-20 chore: stamp BUILD_DATE 2026-04-21 01:11
26447d7 2026-04-20 chore: restore %%BUILD_DATE%% placeholder
f9759f5 2026-04-20 chore: stamp BUILD_DATE 2026-04-21T01:08:09Z
1d8437b 2026-04-20 chore: restore %%BUILD_DATE%% placeholder
6c567f3 2026-04-20 chore: stamp BUILD_DATE 2026-04-21T01:05:48Z
6cc6403 2026-04-20 chore: restore files accidentally deleted by deploy commit (4d8e357)
96ced63 2026-04-20 chore: log deploy fixes (wrong remote, BUILD_DATE stamping)
856d8c5 2026-04-20 refactor: split monolithic index.html into css/js/sw files
4d8e357 2026-04-20 Deploy 2026-04-20 20:38
8a92e54 2026-04-20 chore: restore deploy script, stamp BUILD_DATE 2026-04-20 17:14
e8d868f 2026-04-20 feat: overage bars, silence trim, rest report, milestone bells, review tap UX
4e3aaf8 2026-04-20 chore: remove sharp dev dep, add .gitignore, log svg-to-png tooling
cd95918 2026-04-20 chore: stamp BUILD_DATE 2026-04-20 01:09
fc65df2 2026-04-20 feat: replace fixed-round-count with time-budget chunk model
9ad829b 2026-04-19 chore: log review scrub gesture session
7187a76 2026-04-19 feat: pause audio during scrub drag, resume on lift; stamp BUILD_DATE 2026-04-19 22:22
c52b374 2026-04-19 feat: drag-to-scrub on review overlay; stamp BUILD_DATE 2026-04-19 22:11
173f436 2026-04-19 fix: request mic in user-gesture context to unblock iOS recording
6e23b12 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 20:59
64342be 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 20:57
1c04540 2026-04-19 fix: avoid canvas taint by reusing embedded PNG data URL for icons
1f670b1 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 20:48
59434fc 2026-04-19 chore: embed apple-touch-icon PNG from practice-buddy-icon.svg
2244f2f 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 20:30
2327896 2026-04-19 chore: bundle fonts locally for offline use; strip non-latin variants
eb8e8b7 2026-04-19 ui: line-break before 'It:' on welcome screen
976d0bb 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 20:14
8bc5299 2026-04-19 ui: rewrite welcome overlay copy as bullet list; tighten layout
9091f6d 2026-04-19 feat: add 8th note icon attribution to info panel
0ab2dac 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 16:24
30e9318 2026-04-19 fix: welcome overlay z-index and visibility layering; red CTA button
3ea1077 2026-04-19 chore: stamp BUILD_DATE 2026-04-19 15:56
890b08f 2026-04-19 ui: match ear-tuner visual design on info and welcome overlays; add app icon
19ec291 2026-04-19 feat: welcome screen, app version row with reload, Practice Buddy title
176012e 2026-04-19 chore: add package.json deploy script and BUILD_DATE constant
e2049c0 2026-04-19 fix: nuke AudioContext on visibility restore and pageshow to cure iOS zombie audio
a5e8e6f 2026-04-14 Trim CLAUDE.md stub to 3 lines
a5d003f 2026-04-13 x
3734c15 2026-04-11 Add .gitattributes to normalize line endings to LF
a3046ee 2026-04-11 Update barry and the backlog system
fe7c4d9 2026-04-09 Add backlog
cb63cae 2026-04-05 initial commit
