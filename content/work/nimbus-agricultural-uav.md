---
title: "NIMBUS - Preliminary Design and Flight Dynamics of an Autonomous Agricultural UAV"
date: "2026"
---

## How it was done

Nimbus started from a mission brief rather than a shape: an autonomous electric crop-duster for medium-sized farms, a gap between the large fuel-powered agricultural aircraft built for big farms and the near-total absence of anything sized for smaller ones. Design requirements - 200-liter hopper capacity, 35-minute endurance, a 300 m minimum takeoff distance, and cruise/working velocities of 35/30 m/s - were carried through a full conceptual sizing exercise (a matching plot against wing loading and power loading, checked against stall, takeoff-run, climb, and max-speed constraints) to converge on a configuration: a high-wing monoplane, NACA 2412 wing (12 m span, 12.569 m² reference area), NACA 0012 horizontal stabilizer, and a swept NACA 2412 vertical stabilizer, sized to a 576 kg MTOW with an 83 kg Li-ion battery pack. The airframe itself was modeled in CATIA V5.

<hero-carousel interval="2500" label="Nimbus airframe, CATIA V5 model" fit="contain">
  <img src="../assets/media/work_assets_nimbus/nimbus-iso-render.png" alt="Nimbus three-quarter isometric render" data-caption="Three-quarter isometric view of the converged configuration.">
  <img src="../assets/media/work_assets_nimbus/nimbus-front-view.png" alt="Nimbus front view" data-caption="Front view - full 12 m wingspan and the twin wing-mounted motor stations.">
  <img src="../assets/media/work_assets_nimbus/nimbus-rear-view.png" alt="Nimbus rear view" data-caption="Rear view - boom-mounted NACA 0012 horizontal / NACA 2412 vertical tail.">
  <img src="../assets/media/work_assets_nimbus/nimbus-livery-iso.png" alt="Nimbus livery render on approach" data-caption="Conceptual livery render on approach."">
</hero-carousel>

<!--
  If a clean CATIA STL/STEP export of this airframe exists, swap the
  carousel above (or add alongside it) for the real interactive model -
  cheaper on the wire than five raster frames and lets a reader orbit it
  themselves rather than watching a fixed sequence:

  <stl-reader
    href="https://cdn.jsdelivr.net/gh/toranbdrniroula/<repo>@<tag>/<path>/nimbus.stl"
    bg-color="#ffffff:#000000"
    surface-color="#c9d3de"
    auto-rotate="true"
    height="420">
  </stl-reader>
-->

Aerodynamic sizing itself was carried out in XFLR5: a 575-panel vortex-lattice model of the wing/fuselage/tail, used to run the lift and drag polars behind the matching plot and to locate the stick-fixed neutral point (extrapolating dδe/dCL to zero against three CG positions puts it at 0.783 MAC, giving a 0.885 tail volume coefficient and 40.6 kg/m² wing loading at MTOW).

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-xflr5-mesh.png" alt="XFLR5 panel mesh with AoA/CL/CDi readout">
  <img src="../assets/media/work_assets_nimbus/nimbus-xflr5-geometry-readout.png" alt="XFLR5 geometry and neutral point readout">
</div>
<span class="md-caption">Left: the 575-element wing/fuselage panel mesh mid-analysis. Right: XFLR5's own geometry summary, including the computed neutral point.</span>

The second half of the project, done as a follow-on for the Flight Dynamics course, took that converged XFLR5 geometry, rebuilt it as an X-Plane 12 `.acf` aircraft with the same planform, weight, and CG, and flight-tested the digital twin directly rather than working purely from linearized stability theory: a CG-travel diagram across loading states, the classical longitudinal and lateral-directional dynamic modes (phugoid, short period, spiral, and Dutch roll) excited from trim and logged to decay, stall/climb/descent characteristics built up from measured flight data, and takeoff/landing distances checked against the 300-460 m design constraint.

**Key parameters**

`sizing`: matching plot (wing loading vs. power loading), stall/takeoff/climb/max-speed constraints
`aero method`: XFLR5 vortex-lattice, 575-panel mesh
`airfoils`: NACA 2412 (wing, vertical stabilizer), NACA 0012 (horizontal stabilizer)
`MTOW`: 576 kg · `battery`: 83 kg Li-ion, 265 Wh/kg
`flight test`: X-Plane 12 digital twin (`.acf`, geometry/CG matched to XFLR5)
`dynamic modes checked`: phugoid, short period, spiral, Dutch roll

## Flight dynamics results

All four classical modes converge - the airframe is dynamically stable in every axis, which is the main thing a first-pass configuration needs to get right before anything else is worth trusting.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-phugoid-mode.png" alt="Phugoid mode pitch angle vs time">
  <img src="../assets/media/work_assets_nimbus/nimbus-short-period-mode.png" alt="Short period mode angle of attack vs time">
</div>
<span class="md-caption">Phugoid (ζ = 0.084, ω = 0.361 rad/s) and short period (ζ = 0.011, ω = 1.13 rad/s) - long, lightly-damped vs. fast and quickly damped, as expected.</span>

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-dutch-roll-mode.png" alt="Dutch roll mode sideslip angle vs time">
  <img src="../assets/media/work_assets_nimbus/nimbus-spiral-mode.png" alt="Spiral mode bank angle vs time for three bank disturbances">
</div>
<span class="md-caption">Dutch roll (ζ = 0.107, ω = 1.33 rad/s) damps out in a handful of cycles; spiral mode across 15°/25°/35° bank disturbances settles in a slow oscillation rather than a clean divergence or decay.</span>

A simulated bank-angle response to a 30° command was rated 4 on the Modified Cooper-Harper scale: flyable with moderate pilot compensation, not effortless, but not requiring adaptation either.

<img src="../assets/media/work_assets_nimbus/nimbus-cooper-harper-roll.png" alt="Cooper-Harper roll attitude flight test chart">
<span class="md-caption">Roll-attitude capture to a 30° bank command - overshoot and a settling wobble before it holds.</span>

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-cg-travel.png" alt="CG travel diagram against MAC fraction">
  <img src="../assets/media/work_assets_nimbus/nimbus-neutral-point-slope.png" alt="Elevator slope vs CG position extrapolated to zero">
</div>
<span class="md-caption">CG travel from empty (0.978 MAC) to MTOM (0.394 MAC) stays forward of the 0.783 MAC neutral point across the whole loading range.</span>

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-climb-performance.png" alt="Rate of climb vs airspeed">
  <img src="../assets/media/work_assets_nimbus/nimbus-glide-performance.png" alt="Rate of descent vs airspeed, glide performance">
</div>
<span class="md-caption">7.3 m/s max rate of climb at a 13.6° climb angle; 0.409 m/s min sink at an 8.19° min glide angle - both near 33 m/s.</span>

## What was learned

The converged design met its own brief with margin in most places: 40 m/s cruise and 48 m/s max speed against a 35 m/s cruise requirement. All four dynamic modes came out qualitatively as expected for a conventional configuration, and the XFLR5-predicted neutral point and tail volume held up as sensible numbers once flight-tested rather than just computed.

## What's still open

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-takeoff-distance.png" alt="Take-off distance to 50 ft">
  <img src="../assets/media/work_assets_nimbus/nimbus-landing-distance.png" alt="Landing distance from 50 ft">
</div>
<span class="md-caption">Take-off run to 50 ft came in well past the 300 m design target; the landing curve is closer to expectations.</span>

The takeoff and landing numbers don't fully add up yet. Measured takeoff distance exceeded the 300 m requirement by a wide enough margin that it's not obviously just a rounding gap, and it isn't yet clear whether that's a real airframe/power-loading shortfall or an artifact of how the takeoff run was logged in X-Plane. Everything else - the dynamic modes, the Cooper-Harper rating, climb and glide performance - lines up with what the XFLR5 model predicted, which points more toward a data-collection issue specific to the ground roll than a fundamental sizing error, but that isn't confirmed. The plan is to re-run the takeoff/landing tests with cleaner instrumentation, isolate whether the gap is measurement or a real thrust/weight shortfall, and only revisit the propulsion sizing if it still doesn't close.
