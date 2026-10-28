# Scene Index — In-Engine Cinematic Director (`مزرعه رنگی`)

Total Live Staged Cutscenes: **79** (zero plain dialogue boxes anywhere in the codebase; every scene runs live on the HTML5 Canvas stage with real actors, 2D affine camera choreography, hand-drawn comic emotes, synthesized procedural physics/particles, character voice blips, music ducking, FA/EN locale support, Skip with 100% consequences, and Closing Next-Objective framing).

## Quick Access & Debug / Replay Gallery
- **In-Game Keyboard Shortcut:** Press `F9` at any time on any screen to open/close the **Scene Gallery & Debug Launcher**.
- **Touch / Mobile Access:** Open **Menu (`منو`) -> Settings -> `گالری صحنه‌های سینمایی` / `Scene Director Gallery`**.
- **DevTools / Automation API:** `window.__cinemaDebug.list()`, `window.__cinemaDebug.play(sceneId)`, `window.__cinemaDebug.setLocale("en" | "fa")`.

## Complete Scene Registry (All 79 Scenes)

| # | Scene ID | Category | World Stage | Pacing | Replayable | Cast | Trigger | Prerequisites | Flags / Consequences Set |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | `p1` | prologue | `farm` | Major (30-90s) | Once (Saved) | , ,  | New Game start (`maybeStartPrologue()` on first boot) | !story.prologueSeen | seen:p1, seen:p2, seen:p3, seen:p4, seen:p5, seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 2 | `p2` | prologue | `farm` | Major (30-90s) | Once (Saved) | , ,  | First dawn transition into p2 (`newDay()`) | story.prologueSeen | seen:p2, seen:p3, seen:p4, seen:p5, seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 3 | `p3` | prologue | `farm` | Major (30-90s) | Once (Saved) | , ,  | First dawn transition into p3 (`newDay()`) | story.prologueSeen | seen:p3, seen:p4, seen:p5, seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 4 | `p4` | prologue | `town` | Major (30-90s) | Once (Saved) | ,  | First dawn transition into p4 (`newDay()`) | story.prologueSeen | seen:p4, seen:p5, seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 5 | `p5` | prologue | `town` | Major (30-90s) | Once (Saved) | ,  | First dawn transition into p5 (`newDay()`) | story.prologueSeen | seen:p5, seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 6 | `p6` | prologue | `town` | Major (30-90s) | Once (Saved) | ,  | First dawn transition into p6 (`newDay()`) | story.prologueSeen | seen:p6, seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 7 | `p7` | prologue | `town` | Major (30-90s) | Once (Saved) | ,  | First dawn transition into p7 (`newDay()`) | story.chapter == 0 | seen:p7, debt.note=0, story.chapter=1, debt.flags.prologue |
| 8 | `ch1-outro` | chapter | `farm` | Major (30-90s) | Once (Saved) | , ,  | Settling Chapter 1 deed in `payDebt()` | story.prologueSeen | seen:ch1-outro, story.chapter=2, debt.flags.ch1, seen:note-open-1 |
| 9 | `ch2-outro` | chapter | `farm` | Major (30-90s) | Once (Saved) | , ,  | Settling Chapter 2 deed in `payDebt()` | story.prologueSeen | seen:ch2-outro, story.chapter=3, debt.flags.ch2, seen:note-open-2 |
| 10 | `ch3-outro` | chapter | `farm` | Major (30-90s) | Once (Saved) | , , ,  | Settling Chapter 3 deed in `payDebt()` | story.prologueSeen | seen:ch3-outro, story.chapter=4, debt.flags.ch3, seen:note-open-3 |
| 11 | `ch4-outro` | chapter | `farm` | Major (30-90s) | Once (Saved) | , , , ,  | Settling Chapter 4 deed in `payDebt()` | story.prologueSeen | seen:ch4-outro, story.chapter=5, debt.flags.ch4, seen:note-open-4 |
| 12 | `ch5-outro` | chapter | `farm` | Major (30-90s) | Once (Saved) | , ,  | Settling Chapter 5 deed in `payDebt()` | story.prologueSeen | seen:ch5-outro, story.chapter=6, debt.flags.ch5, seen:note-open-5 |
| 13 | `ch6-outro` | chapter | `town` | Major (30-90s) | Once (Saved) | , ,  | Settling Chapter 6 deed in `payDebt()` | story.prologueSeen | seen:ch6-outro, story.chapter=7, debt.flags.ch6, seen:finale, story.postgame=true |
| 14 | `finale` | chapter | `town` | Major (30-90s) | Once (Saved) | , ,  | Auto-chained after `ch6-outro` (`payDebt` / `finishGame`) | story.prologueSeen | seen:finale, story.postgame=true |
| 15 | `note-open-1` | deed | `farm` | Major (30-90s) | Once (Saved) | ,  | Auto-chained after previous chapter outro (`node.next`) | story.prologueSeen | seen:note-open-1 |
| 16 | `note-open-2` | deed | `farm` | Major (30-90s) | Once (Saved) | ,  | Auto-chained after previous chapter outro (`node.next`) | story.prologueSeen | seen:note-open-2 |
| 17 | `note-open-3` | deed | `farm` | Major (30-90s) | Once (Saved) | , ,  | Auto-chained after previous chapter outro (`node.next`) | story.prologueSeen | seen:note-open-3 |
| 18 | `note-open-4` | deed | `farm` | Major (30-90s) | Once (Saved) | , ,  | Auto-chained after previous chapter outro (`node.next`) | story.prologueSeen | seen:note-open-4 |
| 19 | `note-open-5` | deed | `farm` | Major (30-90s) | Once (Saved) | ,  | Auto-chained after previous chapter outro (`node.next`) | story.prologueSeen | seen:note-open-5 |
| 20 | `visit-due-paid` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-due-paid |
| 21 | `visit-due-missed` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-due-missed |
| 22 | `visit-due-missed-0` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-due-missed-0 |
| 23 | `visit-due-missed-1` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-due-missed-1 |
| 24 | `visit-due-missed-2` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-due-missed-2 |
| 25 | `visit-raid` | visit | `farm` | Major (30-90s) | Yes | ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-raid |
| 26 | `visit-rest` | visit | `farm` | Major (30-90s) | Yes | , ,  | VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires | story.prologueSeen | seen:visit-rest |
| 27 | `reaction-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.prologueSeen | seen:reaction-rich |
| 28 | `reaction-poor` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.prologueSeen | seen:reaction-poor |
| 29 | `reaction-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.prologueSeen | seen:reaction-bad |
| 30 | `sharkhar-ch1-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 1 | seen:sharkhar-ch1-rich |
| 31 | `sharkhar-ch1-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 1 | seen:sharkhar-ch1-bad |
| 32 | `sharkhar-ch1-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 1 | seen:sharkhar-ch1-debt |
| 33 | `sharkhar-ch2-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 2 | seen:sharkhar-ch2-rich |
| 34 | `sharkhar-ch2-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 2 | seen:sharkhar-ch2-bad |
| 35 | `sharkhar-ch2-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 2 | seen:sharkhar-ch2-debt |
| 36 | `sharkhar-ch3-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 3 | seen:sharkhar-ch3-rich |
| 37 | `sharkhar-ch3-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 3 | seen:sharkhar-ch3-bad |
| 38 | `sharkhar-ch3-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 3 | seen:sharkhar-ch3-debt |
| 39 | `sharkhar-ch4-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 4 | seen:sharkhar-ch4-rich |
| 40 | `sharkhar-ch4-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 4 | seen:sharkhar-ch4-bad |
| 41 | `sharkhar-ch4-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 4 | seen:sharkhar-ch4-debt |
| 42 | `sharkhar-ch5-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 5 | seen:sharkhar-ch5-rich |
| 43 | `sharkhar-ch5-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 5 | seen:sharkhar-ch5-bad |
| 44 | `sharkhar-ch5-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 5 | seen:sharkhar-ch5-debt |
| 45 | `sharkhar-ch6-rich` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 6 | seen:sharkhar-ch6-rich |
| 46 | `sharkhar-ch6-bad` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 6 | seen:sharkhar-ch6-bad |
| 47 | `sharkhar-ch6-debt` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 6 | seen:sharkhar-ch6-debt |
| 48 | `sharkhar-postgame` | sharkhar | `farm` | Major (30-90s) | Yes | ,  | Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`) | story.chapter == 7 | seen:sharkhar-postgame |
| 49 | `town-grandma-0` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-grandma-0 |
| 50 | `town-grandma-1` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-grandma-1 |
| 51 | `town-grandma-2` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-grandma-2 |
| 52 | `town-sara-0` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-sara-0 |
| 53 | `town-sara-1` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-sara-1 |
| 54 | `town-sara-2` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-sara-2 |
| 55 | `town-engineer-0` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-engineer-0 |
| 56 | `town-engineer-1` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-engineer-1 |
| 57 | `town-engineer-2` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-engineer-2 |
| 58 | `town-rancher-0` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-rancher-0 |
| 59 | `town-rancher-1` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-rancher-1 |
| 60 | `town-rancher-2` | villager | `town` | Snappy (10-20s) | Yes | ,  | Walking up & tapping a villager in Town (`talkToTownNpc(i)`) | story.prologueSeen | seen:town-rancher-2 |
| 61 | `area-intro-town` | area | `town` | Major (30-90s) | Once (Saved) | ,  | First arrival transition into town (`engine.ts`) | !story.seen["area-intro-town"] | seen:area-intro-town |
| 62 | `area-intro-river` | area | `river` | Major (30-90s) | Once (Saved) | ,  | First arrival transition into river (`engine.ts`) | !story.seen["area-intro-river"] | seen:area-intro-river |
| 63 | `area-intro-apiary` | area | `apiary` | Major (30-90s) | Once (Saved) | ,  | First arrival transition into apiary (`engine.ts`) | !story.seen["area-intro-apiary"] | seen:area-intro-apiary |
| 64 | `shop-intro-seed` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on seed storefront in Town (`townTap`) | !story.seen["shop-intro-seed"] | seen:shop-intro-seed |
| 65 | `shop-intro-market` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on market storefront in Town (`townTap`) | !story.seen["shop-intro-market"] | seen:shop-intro-market |
| 66 | `shop-intro-work` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on work storefront in Town (`townTap`) | !story.seen["shop-intro-work"] | seen:shop-intro-work |
| 67 | `shop-intro-animal` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on animal storefront in Town (`townTap`) | !story.seen["shop-intro-animal"] | seen:shop-intro-animal |
| 68 | `shop-intro-carp` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on carp storefront in Town (`townTap`) | !story.seen["shop-intro-carp"] | seen:shop-intro-carp |
| 69 | `shop-intro-estate` | shop | `town` | Snappy (10-20s) | Once (Saved) | ,  | First tap on estate storefront in Town (`townTap`) | !story.seen["shop-intro-estate"] | seen:shop-intro-estate |
| 70 | `season-dawn-summer` | season | `farm` | Snappy (10-20s) | Once (Saved) | ,  | First dawn transition into summer (`newDay()`) | !story.seen["season-dawn-summer"] | seen:season-dawn-summer |
| 71 | `season-dawn-autumn` | season | `farm` | Snappy (10-20s) | Once (Saved) | ,  | First dawn transition into autumn (`newDay()`) | !story.seen["season-dawn-autumn"] | seen:season-dawn-autumn |
| 72 | `season-dawn-winter` | season | `farm` | Snappy (10-20s) | Once (Saved) | ,  | First dawn transition into winter (`newDay()`) | !story.seen["season-dawn-winter"] | seen:season-dawn-winter |
| 73 | `season-dawn-spring` | season | `farm` | Snappy (10-20s) | Once (Saved) |  | First dawn transition into spring (`newDay()`) | !story.seen["season-dawn-spring"] | seen:season-dawn-spring |
| 74 | `quest-done-q1` | quest | `farm` | Major (30-90s) | Once (Saved) | ,  | Completing Main Chapter Quest Q1 (`checkStoryQuests()`) | chapter >= 1; quest metric >= target | seen:quest-done-q1 |
| 75 | `quest-done-q2` | quest | `farm` | Major (30-90s) | Once (Saved) | ,  | Completing Main Chapter Quest Q2 (`checkStoryQuests()`) | chapter >= 2; quest metric >= target | seen:quest-done-q2 |
| 76 | `quest-done-q3` | quest | `river` | Major (30-90s) | Once (Saved) | ,  | Completing Main Chapter Quest Q3 (`checkStoryQuests()`) | chapter >= 3; quest metric >= target | seen:quest-done-q3 |
| 77 | `quest-done-q4` | quest | `farm` | Major (30-90s) | Once (Saved) | , ,  | Completing Main Chapter Quest Q4 (`checkStoryQuests()`) | chapter >= 4; quest metric >= target | seen:quest-done-q4 |
| 78 | `quest-done-q5` | quest | `farm` | Major (30-90s) | Once (Saved) | ,  | Completing Main Chapter Quest Q5 (`checkStoryQuests()`) | chapter >= 5; quest metric >= target | seen:quest-done-q5 |
| 79 | `quest-done-q6` | quest | `farm` | Major (30-90s) | Once (Saved) | , ,  | Completing Main Chapter Quest Q6 (`checkStoryQuests()`) | chapter >= 6; quest metric >= target | seen:quest-done-q6 |

## Procedural Animations & Visual Effects Implemented in Engine
- **12-Bone Procedural Rig Acting (`src/game/rig.ts` + `src/game/cinemaStage.ts`):** `idle`, `walk`, `talk`, `wave`, `cheer`, `point`, `bow`, `recoil`, `shiver`, `sit`, `swing` across real `farmer`, `jahangir`, and all `TOWN_ACTORS` (`turan`, `mash_ali`, `golpari`, `asghar`, `ostad_reza`, `narges`, plus temporary cast walkers `grandma` & `salar`).
- **Procedural Physics & Squash/Stretch (`src/game/cinemaStage.ts`):** Parabolic jump arcs (`vy` + gravity), idle breathing bobbing, hit-impact squash-and-stretch (`sx/sy`), shivering tremors, and sinusoidal hand-prop scale pulsing.
- **Live Lip-Sync & Blinking (`src/game/cinemaArt.ts`):** Real-time mouth-flap vowel opening synced to typewriter voice blips plus natural eye-blink cycles drawn directly over the actor head bone in world coordinates.
- **Hand-Drawn Comic Emote Bubbles (`src/game/cinemaArt.ts`):** Pop-spring comic callouts (`!`, `?`, `heart`, `anger`, `sweat`, `music`, `dots`, `star`, `coin`) with zero emoji.
- **Zero-GC Pooled Particle System (`src/game/cinemaStage.ts`):** Fixed 48-slot ring buffer emitting `dust`, `sparkle`, `heart`, `sweat`, `coin`, `leaf`, `smoke`, and `impact` bursts with zero per-frame heap allocations.
- **2D Affine Camera Rig (`src/game/engineRender.ts`):** Smooth eased world zoom (`1.0x–1.72x`), establishing pan, active speaker tracking, reaction snap cuts, impact camera shake, cross-scene fade, and cinema letterbox framing.
- **Synthesized Audio & Ducking (`src/game/cinemaAudio.ts` + `src/game/sound.ts`):** Character-specific triangle/sawtooth WebAudio voice blips (`VOICE_PROFILES`), automatic background music ducking (`0.30x` under dialogue, smooth ramp restore on scene exit), and foley cues (`footstep`, `door`, `gasp`, `cheer`, `thud`, `slam`, `sparkle`, `coin`, `paper`, `rooster`, `sigh`, `laugh`).

