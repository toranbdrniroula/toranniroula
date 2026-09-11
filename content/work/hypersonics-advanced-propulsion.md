---
title: "Hypersonics and Advanced Propulsion: Shock Interactions and a Scramjet Intake"
date: "2026"
---

## How it was done

This started as a homework assignment and I let it run longer than it needed to. It has three parts, all at ISA-20 km freestream conditions and solved with `rhoCentralFoam` (Kurganov-Tadmor flux, van Leer reconstruction) in OpenFOAM.

**Cylinder pressure distribution at Mach 6.** Three local-inclination methods — Modified Newtonian theory, the Tangent Wedge method, and Shock-Expansion theory — were used to predict the surface C_p distribution on a circular cylinder, then checked against inviscid CFD on a pear-shaped mesh aligned with the bow shock.

**Shock-shock interaction classification at Mach 3.** Shock-polar theory was used to predict, ahead of time, whether a pair of intersecting oblique shocks (from ±15° and ±30° ramps) would produce a regular (Type I) reflection or a Mach (Type II) interaction, by checking whether the downstream polars intersect on the weak-shock branch. Both Kantrowitz-limit area ratios were kept under the 1.39 starting limit so the CFD cases would actually start without a normal shock choking the duct. CFD at both deflection angles then confirmed the polar prediction.

**A single-ramp scramjet intake at Mach 6.** Given a target static pressure ratio (π = 20) and a 50 mm isolator height, the oblique-shock relations and θ-β-M equation were solved simultaneously for the ramp angle (14.15°) and resulting geometry (1.026 m ramp length, 0.301 m capture height). Both an inviscid and a RANS (k-ω SST) simulation of the resulting intake were run to check the design against CFD.

**Key parameters**

`solver`: rhoCentralFoam (Kurganov-Tadmor, van Leer)
`cylinder`: M∞ = 6, ~40k cells
`shock-shock`: M∞ = 3, Type I (θ = ±15°) and Type II (θ = ±30°) ramps
`scramjet intake`: M∞ = 6, single ramp, design π = 20, design TPR = 0.50

## What was learned

Modified Newtonian theory tracked the CFD C_p distribution most uniformly across the cylinder's windward face, while the Tangent Wedge and Shock-Expansion methods did better near the shoulder (θ ≈ 40–70°) where the local geometry actually resembles a wedge — all three struggle at the stagnation point itself, where the CFD peak C_p exceeded the Modified Newtonian prediction by about 11%. The shock-shock CFD matched the polar predictions cleanly: the ±15° case showed a clean regular reflection with a visible slip line and negligible total-pressure loss, while the ±30° case showed the full signature of a Mach interaction — a near-normal Mach stem, two triple points, a slipstream, and a substantially larger entropy rise across the stem than across either oblique shock. For the scramjet intake, the inviscid CFD matched the design-point total pressure recovery and static pressure ratio to within 0.4%, confirming the design procedure was internally consistent; the RANS case then showed the boundary-layer displacement effect you'd expect — a thickened boundary layer at the shoulder, a small separation bubble where the cowl shock impinges, and the leading-edge shock landing slightly off the ideal inviscid impingement point as a result.

## What's still open

The single-ramp intake's total pressure recovery (0.50) is characteristic of one strong oblique shock at Mach 6 — a two- or three-ramp system would split the compression across weaker shocks and recover meaningfully more total pressure, at the cost of a longer, more complex intake. That multi-ramp redesign, plus checking the RANS boundary-layer prediction's sensitivity to the fully-turbulent assumption (the flow may not actually be turbulent over the whole ramp at these conditions), are the natural next steps if this keeps growing past assignment scope.
