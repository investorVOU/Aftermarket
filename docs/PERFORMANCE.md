# November 13 performance and connection check

**Candidate changes are local, not deployed. No push or default-branch change was made for this task.**

## Method and limits

Installed Chrome headless on this Windows laptop, 1280×800 desktop and 390×844 mobile viewport with touch emulation. Six-second warm-up, then 12 seconds alternating movement direction every 1.2 seconds. No CPU or network throttle. Chrome CPU samples, request timings and function timing hooks were collected. The baseline uses published `1bdd1df` client code; the candidate intercepts HTML/client/CSS locally while requests still go to **https://aftmarket.xyz**. The same real Supabase guest resumes the same hosted island. The world continues evolving between runs, so visible mesh counts and NPC positions change. This is a short observation, not a controlled benchmark or physical-phone test.

WebGL reports **Intel UHD Graphics, ANGLE D3D11**; CDP reports GPU compositing and WebGL enabled. This run is GPU accelerated, not SwiftShader software rendering. The earlier November 12 samples around 22/32 FPS were not reproduced. GPU availability and competing machine load were not recorded for those older samples, so the difference cannot honestly be attributed to this patch.

[Hosted raw measurements](HOSTED_PERFORMANCE_PROFILE.json) and [local fallback measurements](PERFORMANCE_PROFILE.json) include CPU samples, renderer statistics, sync timing and panel costs. `render` measures CPU time inside Three.js, including shadow work; it is not a completed GPU timestamp. Shadow timings are a subset of render timing and must not be added again.

## Hosted API comparison

| Metric | Published desktop | Candidate desktop | Published mobile viewport | Candidate mobile viewport |
|---|---:|---:|---:|---:|
| Average FPS | 59.77 | 60.03 | 59.97 | 59.00 |
| p95 frame interval | 37.6 ms | 30.5 ms | 24.4 ms | 21.9 ms |
| Render CPU median | 5.8 ms | 5.2 ms | 4.0 ms | 6.2 ms |
| Render CPU p95 | 18.9 ms | 14.3 ms | 12.3 ms | 10.8 ms |
| Shadow CPU p95 | 10.1 ms | 0 ms | 7.7 ms | 0.1 ms |
| Sampled draw calls | 658 | 566 | 261 | 179 |
| Sampled triangles | 172,232 | 118,716 | 151,914 | 100,512 |
| Sampled pixel ratio | 0.9 | 1.0 | 1.0 | 0.9 |
| Sync median | 381.67 ms | 357.85 ms | 392.90 ms | 357.18 ms |
| Sync p95 | 630.70 ms | 467.59 ms | 468.72 ms | 739.76 ms |
| Maximum overlapping syncs | 1 | 1 | 1 | 1 |

Average FPS was already near the display limit in this run. Frame spikes improved, but mobile median render CPU and p95 network latency worsened. There is no basis for claiming a general network speedup or a guaranteed 50–60 FPS on every laptop / 30+ on a physical phone. The candidate needs hosted deployment and a real-device check after publication approval.

## Where time goes

1. **Renderer submission and world matrix traversal dominate the CPU profile.** The original terrain alone had 72,200 triangles. Its new 128×128 grid has 32,768, with the same terrain function and colours. Water drops from 7,200 to 2,048 triangles and updates at 20 Hz. No post-processing pass exists. Repeated scene meshes have not been merged or instanced in this deadline patch.
2. **Shadow refresh creates spikes.** It previously refreshed at 15 Hz with soft filtering. Desktop shadow maps are now capped at 1024² and 8 Hz; touch devices skip shadows. Sustained FPS below 45 first disables shadows, then lowers pixel ratio. DPR remains capped at 1.5 touch / 2 desktop, with a 0.9 adaptive floor. Candidate samples had shadows disabled.
3. **Open-panel DOM/canvas work is the next visible burst.** Candidate phone render p95 was 8.8 ms desktop / 19.8 ms mobile in a separate short panel sample. Map draw p95 was 17.8 / 14.4 ms while open; it returns immediately when closed. These are not continuous movement-frame costs. Closed-panel update median was 0.1 ms. The movement sample has zero phone rebuilds because the phone is closed. No large UI redesign is justified by those closed-panel timings.

Baseline `GameState.apply` median was 0.3–0.4 ms, p95 0.6–0.7 ms. Candidate mobile p95 reached 2.3 ms. Camera median was 0.1–0.3 ms, collision p95 0.1 ms; farm visuals p95 0.1–0.3 ms. Connected browsers do **not** execute NPC pathfinding/economic simulation: that runs on the server. V8 sampled roughly 5.4 ms of GC across each baseline 12-second capture; candidate samples were 2.6 / 7.3 ms. These samples do not identify GC as the primary stutter source or establish absence of a leak.

The local 49× server tick benchmark (200 calls, 2.45 simulated seconds each) measured median 5.23 ms / p95 17.32 ms, max 39.85 ms. Snapshot capture plus JSON serialization measured 1.89 / 3.40 ms, about 47 KB. These are local measurements, not Render CPU timings. Many simultaneous islands/previews can exhaust a small instance's event-loop budget. New `Server-Timing` API headers will expose application/serialization duration after deployment; the current hosted build does not send them.

## Movement and UI changes

Local prediction remains independent of authoritative player snapshots. Corrections retain the 0.65 m threshold and smoothing; stale/out-of-order replies are ignored. The prediction budget now advances during actual movement, so a long idle period cannot make the first keypress wait for sync. Prediction still stops after one second of unconfirmed movement. Economy and ownership stay server-authoritative.

Only one state request runs at a time. Moving input targets 150 ms between sends; idle input targets one second, with input changes checked every 50 ms. HUD work triggered by snapshots is capped near four times per second, alongside the existing 500 ms timer. Open legacy panels use a state signature before rebuilding; closed inventory is updated when opened. Movement reuses its input vector rather than allocating one every frame. UI typing is protected from phone refresh while the message input is focused.

## Why guest entry said “fetch aborted”

Health/configuration requests initially timed out. Later they returned 200 in about two seconds with `configured: true`, `guestEnabled: true`. A real guest creation succeeded in **36,133 ms**, exceeding the published client's **20,000 ms** timeout. That reproduces a concrete way to show failure after a guest was already created. It does not establish whether Render startup, network transit or Supabase caused that request's delay.

The candidate bounds configuration/warm-up reads at 60 seconds, gives guest creation 45 seconds, deduplicates concurrent session loads and reuses an obtained session. It translates timeout, network and non-JSON gateway responses into useful recovery messages and offers Retry connection. It does not automatically replay guest creation after a timeout. The screener CLI now allows 60 seconds for configuration/guest creation too.

A fresh mobile Chrome run with the candidate client and real hosted APIs then
loaded a new guest island in **8,237 ms** after its single guest request, without
page errors. The managed identity stayed inside the collapsed technical section.
[Browser evidence](GUEST_RECOVERY_VERIFICATION.json). This verifies that candidate
flow against live services; it does not mean the candidate has been deployed.

The extended hosted `demo:check` also passed gathering, crafting, the real week,
changed prices, merchant ownership, final furniture mint, sale for $50 credits,
final balance zero and the matching burn receipt. [Real testnet evidence](DEMO_SALE_CHECK_EVIDENCE.json).

The repository's Render Blueprint uses the free plan. Render documents [idle spin-down after 15 minutes and startup around one minute](https://render.com/docs/free). For a reliably available judging demo, the owner can select an always-on service instance through November 18; no paid change was made here. Check CPU and memory metrics before choosing a larger instance. If the service is outside Europe, compare Frankfurt against the Supabase project's configured EU North region; current Render region was not visible to this agent. [Changing region requires a new Render service](https://render.com/docs/regions), so do not casually move the existing production service immediately before the deadline. Keep the same wallet master key and signer, one settlement worker, and the correct `APP_ORIGIN`.

Public config now reports the private RPC fallback configured. Groq is optional and currently unconfigured; it cannot fix render FPS or authenticate guests. See [Groq setup and boundaries](MERCHANT_AI.md), [loan rules](GAME_LOOP.md) and [operations](OPERATIONS.md).
