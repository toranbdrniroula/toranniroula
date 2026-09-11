---
title: "NIMBUS — Preliminary Design and Flight Dynamics of an Autonomous Agricultural UAV"
date: "2026"
---

## How it was done

Nimbus started from a mission brief rather than a shape: an autonomous electric crop-duster for medium-sized farms, a gap between the large fuel-powered agricultural aircraft built for big farms and the near-total absence of anything sized for smaller ones. Design requirements — 200-liter hopper capacity, 35-minute endurance, a 300 m minimum takeoff distance, and cruise/working velocities of 35/30 m/s — were carried through a full conceptual sizing exercise (a matching plot against wing loading and power loading, checked against stall, takeoff-run, climb, and max-speed constraints) to converge on a configuration: a high-wing monoplane, NACA 2412 wing (12 m span, 12.569 m² reference area), NACA 0012 horizontal stabilizer, and a swept NACA 2412 vertical stabilizer, sized to a 576 kg MTOW with an 83 kg Li-ion battery pack.

The second half of the project, done as a follow-on for the Flight Dynamics course, took that converged geometry and actually characterized how it flies: a CG-travel diagram across loading states, neutral-point determination from elevator-trim-versus-C_L data, and the classical longitudinal and lateral-directional dynamic modes — phugoid, short period, spiral, and Dutch roll — extracted and plotted individually. Stall, climb, and descent characteristics were built up from measured/predicted data points fit against theory, and takeoff/landing distances were checked against the 300–460 m design constraint.

**Key parameters**

`sizing`: matching plot (wing loading vs. power loading), stall/takeoff/climb/max-speed constraints
`airfoils`: NACA 2412 (wing, vertical stabilizer), NACA 0012 (horizontal stabilizer)
`MTOW`: 576 kg · `battery`: 83 kg Li-ion, 265 Wh/kg
`dynamic modes checked`: phugoid, short period, spiral, Dutch roll

## What was learned

The converged design met its own brief with margin in most places: 40 m/s cruise and 48 m/s max speed against a 35 m/s cruise requirement, and a 460 m takeoff / 390 m landing distance against the 300 m minimum-field-length target (a useful reminder that a "minimum" constraint in the matching plot doesn't automatically become the achieved value once the rest of the sizing is fixed). All four dynamic modes came out qualitatively as expected for a conventional configuration — a lightly damped phugoid, a fast, well-damped short period, and stable spiral and Dutch roll behavior — and a simulated bank-angle response to a 30° command was rated 4 on the Modified Cooper–Harper scale: flyable with moderate pilot compensation, not effortless, but not requiring adaptation either.

## What's still open

This was a fixed-scope course deliverable rather than an open research question, so there's no active follow-on. If it were pushed further, the obvious next step would be validating the predicted stability derivatives against a scaled model or a higher-fidelity 6-DOF simulation, since everything here was built from classical sizing relations and linearized stability theory rather than flight test or CFD-derived aerodynamics.
