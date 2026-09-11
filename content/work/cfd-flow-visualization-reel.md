---
title: "CFD Flow Visualization Reel"
date: "2025-2026"
---

<!-- REPLACE ME: this whole page is a scaffold. Swap media_src/thumbnail
     in work-index.json for a real video/GIF once one exists, then turn
     each bullet below into its own section with the actual clip
     embedded via <video-embed> (see templates/work-piece/body.md) and a
     couple of sentences on the setup. -->

## What this is

A loose, growing collection of compressible-flow CFD runs done for no reason other than wanting to see what a particular flow looks like — the same OpenFOAM/`rhoCentralFoam` toolchain used for coursework like the [hypersonics assignment](case-file.html?slug=hypersonics-advanced-propulsion&category=research), pointed at whatever came to mind that week rather than a specific deliverable.

**Key parameters**

`solver`: rhoCentralFoam, OpenFOAM
`regimes`: subsonic through hypersonic
`subjects (so far)`: supersonic bullet, flow past a cylinder across the subsonic–hypersonic range, a Tesla valve

## REPLACE ME: supersonic bullet

A classic Schlieren-style compressible-flow validation case — a bullet in supersonic flight, bow shock and expansion fans visualized from the density field.

## REPLACE ME: flow past a cylinder, subsonic to hypersonic

The same cylinder geometry run across a range of freestream Mach numbers, side by side, to see the bow shock and wake topology change from an incompressible-looking wake to a Mach-6-style detached shock.

## REPLACE ME: Tesla valve

A Tesla valve run in both flow directions to see the asymmetric pressure-drop behavior that makes it a valve with no moving parts.
