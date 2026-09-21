---
title: "NIMBUS - Preliminary Design and Flight Dynamics of an Autonomous Agricultural UAV"
date: "2026"
---

This piece doubles as a walkthrough of the conceptual-design pipeline for aircraft design, completed as part of aircraft design coursework. It begins with initial weight estimate, followed by constraint (matching-plot) analysis and configuration layout. After this aerodynamic modeling is performed, followed with independent flight-test verification. Nimbus, and agricultural e-duster designed here follows this methodology closely to meet strict design criteria.

## Brief Overview

The concept of Nimbus started from a mission brief: an autonomous electric crop-duster for medium-sized farms, a gap between the large fuel-powered agricultural aircraft built for big farms and the near-total absence of anything sized for smaller ones. Requirements - 200-liter hopper capacity, 35-minute endurance, a 300 m minimum takeoff distance, and cruise/working velocities of 35/30 m/s - drove a full constraint-analysis sizing exercise, following the same sequence taught in Aircraft Preliminary Design course in IOE pulchowk. Purdue's AAE 451 course, documented in the CODE Lab's open [Aircraft Design](https://computationaldesignlab.github.io/aircraft-design/intro.html) notes, Prof. Daniel Raymer's book on aircraft design along with mission-specific assumptions drawn from Kelvin Young's 2016 SJSU thesis on crop-dusting UAV conceptual design served as necessary reference materials.

Each requirement becomes a constraint line on power loading (W/P) vs. wing loading (W/S): a stall-speed line from `V_stall = √(2W / (ρ·S·CL_max))`, a takeoff-distance line for the 300 m field length, a climb-gradient line, and a cruise/max-speed line from the drag polar. The feasible region is whatever satisfies all four simultaneously; the design point sits at the lowest power loading inside it, which for this configuration is also where the stall and takeoff-run lines cross - about 40.6 kg/m² wing loading.

<img src="../assets/media/work_assets_nimbus/nimbus-matching-plot.svg" alt="Matching plot: power loading vs wing loading with stall, takeoff, climb, ceiling and max-speed constraint lines, design point marked">
<span class="md-caption">Matching plot: power loading vs. wing loading, with the design point at the stall/takeoff-run intersection.</span>

The structural envelope was checked the same way, with a V-n diagram built from a FAR-23-style maneuvering boundary (parabolic to n = 3.5, mirrored to n = −1.5) plus gust lines from `Δn = (ρ·V·a·U_de·K_g) / (2·W/S)` with K_g = 0.88, evaluated at ±7.5 m/s and ±15 m/s gusts and a = 5.73/rad from the XFLR5 lift-curve slope. V_ne is set at 1.4×V_cruise = 56 m/s.

<img src="../assets/media/work_assets_nimbus/nimbus-vn-diagram-real.svg" alt="V-n diagram with maneuvering and gust envelopes for Nimbus">
<span class="md-caption">V-n diagram: n = 3.5 / −1.5 maneuvering limits with ±7.5 and ±15 m/s gust lines out to V_ne = 56 m/s.</span>

That sizing converged on a high-wing monoplane - NACA 2412 wing (12 m span, 12.569 m² reference area), NACA 0012 horizontal stabilizer, swept NACA 2412 vertical stabilizer - at a 576 kg MTOW with an 83 kg Li-ion pack, modeled in CATIA V5.

<scroll-reveal-viewer mode="images" label="Nimbus airframe, CATIA V5 model">
  <reveal-frame src="../assets/media/work_assets_nimbus/nimbus-cad-detailed.jpg" alt="Detailed CATIA V5 model with MAC reference lines">
    <reveal-caption><span class="tag">Airframe</span><h4>CATIA V5 model</h4><p>High-wing monoplane on tricycle gear, with the MAC/CG reference lines used for the weight-and-balance work below.</p></reveal-caption>
  </reveal-frame>
  <reveal-frame src="../assets/media/work_assets_nimbus/nimbus-front-view.png" alt="Nimbus front view">
    <reveal-caption><span class="tag">Wing</span><h4>12 m high wing</h4><p>NACA 2412, AR 11.4, taper 0.75, 4° dihedral - 40.6 kg/m² wing loading off the matching plot above.</p></reveal-caption>
  </reveal-frame>
  <reveal-frame src="../assets/media/work_assets_nimbus/nimbus-xflr5-wireframe.png" alt="XFLR5 panel wireframe of the airframe">
    <reveal-caption><span class="tag">Aerodynamics</span><h4>XFLR5 panel model</h4><p>The same planform, re-meshed as a vortex-lattice model for the polars, tail volume, and neutral point.</p></reveal-caption>
  </reveal-frame>
  <reveal-frame src="../assets/media/work_assets_nimbus/nimbus-rear-view.png" alt="Nimbus rear view">
    <reveal-caption><span class="tag">Propulsion</span><h4>Twin wing-mounted motors</h4><p>One motor station per wing, keeping the fuselage centerline clear for the 200 L hopper.</p></reveal-caption>
  </reveal-frame>
  <reveal-frame src="../assets/media/work_assets_nimbus/nimbus-livery-iso.png" alt="Nimbus livery render on approach">
    <reveal-caption><span class="tag">Undercarriage</span><h4>Fixed tricycle gear</h4><p>Sized against the takeoff/landing constraint lines on the matching plot above.</p></reveal-caption>
  </reveal-frame>
</scroll-reveal-viewer>

<!--
  mode="model" swaps this for a real orbiting 3D model instead of five flat
  renders - same markup shape, just <reveal-frame href="....stl" rot="x,y,z">
  children instead of src="...". It needs Three.js loaded as an import-mapped
  module before this element upgrades:

    <script type="importmap">
    { "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    } }
    </script>
    <script type="module">
      import * as THREE from 'three';
      import { STLLoader } from 'three/addons/loaders/STLLoader.js';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
      window.THREE_SRV = { THREE, STLLoader, GLTFLoader };
    </script>
    <script src="../js/scroll-reveal-viewer.js"></script>

  worth doing once a full wing+tail+fuselage STL/GLB export exists - the
  fuselage.obj on hand is only the fuselage lofting, not the full airframe.
-->

**Key parameters**

`sizing`: matching plot (wing loading vs. power loading) + V-n diagram, per FAR-23-style constraints
`aero method`: XFLR5 vortex-lattice model
`airfoils`: NACA 2412 (wing, vertical stabilizer), NACA 0012 (horizontal stabilizer)
`MTOW`: 576 kg · `battery`: 83 kg Li-ion, 265 Wh/kg
`flight test`: X-Plane 12 digital twin (`.acf`, geometry/CG matched to XFLR5)

## Aerodynamic modeling

The matching-plot planform was rebuilt in XFLR5 as a vortex-lattice model to get the lift/drag polars behind the climb and cruise checks, and the stick-fixed neutral point the CG-travel work below is built around.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-xflr5-mesh.png" alt="XFLR5 panel mesh with AoA/CL/CDi readout">
  <img src="../assets/media/work_assets_nimbus/nimbus-xflr5-geometry-readout.png" alt="XFLR5 geometry and neutral point readout">
</div>
<span class="md-caption">Left: the wing/fuselage vortex-lattice model mid-analysis. Right: XFLR5's geometry summary - 40.6 kg/m² wing loading, 0.885 tail volume coefficient, neutral point 0.854 m aft of the wing LE.</span>

<img src="../assets/media/work_assets_nimbus/nimbus-stall-characteristics.svg" alt="Stall speed vs altitude chart, linear fit">
<span class="md-caption">Stall speed vs. altitude: 31 KIAS at 5,200 ft to 63 KIAS at 12,000 ft.</span>

## Flight-test verification

The XFLR5 geometry was rebuilt in Plane Maker as an X-Plane 12 `.acf` aircraft with matched planform, weight, and CG, then flight-tested following the department's flight-dynamics practical: get it flyable, determine the neutral point from flight data, run the Cooper-Harper handling assessment, then the sawtooth-climb/descent and stall-speed maneuvers. Everything below is measured from that aircraft's own telemetry - ground height, true airspeed, position, logged to CSV and reduced in pandas/NumPy - independent of whatever XFLR5 predicted.

### Neutral point and CG travel

At three CG positions, elevator trim was recorded against C<sub>L</sub> across several airspeeds; the slope dδ<sub>e</sub>/dC<sub>L</sub> of each fit, plotted against X<sub>cg</sub>/MAC and extrapolated to zero, gives the flight-test neutral point.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-elevator-trim.svg" alt="Elevator deflection vs coefficient of lift for three CG positions">
  <img src="../assets/media/work_assets_nimbus/nimbus-neutral-point-slope.svg" alt="Elevator slope vs CG position extrapolated to zero">
</div>
<span class="md-caption">Extrapolating to dδ<sub>e</sub>/dC<sub>L</sub> = 0 gives X<sub>NP</sub>/MAC = 0.7825 - equivalent to 0.827 m aft of the LE, within 3% of XFLR5's own 0.854 m panel-method estimate. That agreement between an independent flight-data regression and a linearized VLM prediction is the more interesting result than either number alone.</span>

<img src="../assets/media/work_assets_nimbus/nimbus-cg-travel.svg" alt="CG travel diagram against MAC fraction">
<span class="md-caption">CG travel: (0.978 MAC, 293 kg) empty → (0.636 MAC, 376 kg) battery-loaded → (0.394 MAC, 601 kg) MTOM, plotted against the 0.7825 MAC neutral point - the CG stays forward of it across the full loading range.</span>

### Dynamic stability and handling

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-phugoid-mode.svg" alt="Phugoid mode pitch angle vs time">
  <img src="../assets/media/work_assets_nimbus/nimbus-short-period-mode.svg" alt="Short period mode angle of attack vs time">
</div>
<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-dutch-roll-mode.svg" alt="Dutch roll mode sideslip angle vs time">
  <img src="../assets/media/work_assets_nimbus/nimbus-spiral-mode.svg" alt="Spiral mode bank angle vs time for three bank disturbances">
</div>
<span class="md-caption">Phugoid (ζ = 0.084, ω = 0.361 rad/s), short period (ζ = 0.011, ω = 1.13 rad/s), Dutch roll (ζ = 0.107, ω = 1.33 rad/s), and spiral mode across 15°/25°/35° bank disturbances - all four converge.</span>

Handling was rated on the Modified Cooper-Harper scale in both a clean high-speed cruise and a low-speed level-flight configuration, each in a gentle and a steep bank, per the practical's Part 3. Nimbus rated **4**: deficiencies warrant improvement and pilot compensation is moderate, but it stays controllable throughout.

<img src="../assets/media/work_assets_nimbus/nimbus-cooper-harper-roll.svg" alt="Cooper-Harper roll attitude flight test chart">
<span class="md-caption">Roll-attitude capture to a 30° bank command - overshoot, then a settling wobble before it holds.</span>

### Climb, glide, and field performance

Climb and glide performance follow the practical's sawtooth-run method: fly a fixed-speed climb or descent through a reference altitude band, record the rate, repeat at several speeds, fit a quadratic to speed vs. rate.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-climb-performance.svg" alt="Rate of climb vs airspeed">
  <img src="../assets/media/work_assets_nimbus/nimbus-glide-performance.svg" alt="Rate of descent vs airspeed, glide performance">
</div>
<span class="md-caption">Climb: 7.31 m/s max ROC at 33.0 m/s, 13.7° max climb angle at 27.4 m/s. Glide: 0.41 m/s min sink at 32.5 m/s, 8.2° min glide angle at 35.7 m/s (≈7:1 ratio).</span>

Takeoff and landing distance came from the same telemetry: ground height and position through the ground roll, converted to distance via a haversine calculation, distance to 50 ft AGL read off as the field length. The aircraft takes off and lands cleanly in both cases - this is a sizing-margin question, not a flyability one.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_nimbus/nimbus-takeoff-distance.svg" alt="Take-off distance to 50 ft">
  <img src="../assets/media/work_assets_nimbus/nimbus-landing-distance.svg" alt="Landing distance from 50 ft">
</div>
<span class="md-caption">Takeoff to 50 ft: ≈460 m against the 300 m matching-plot target. Landing from 50 ft: ≈390 m.</span>

## What was learned

The converged design met its brief with margin in most places - 40 m/s cruise and 48 m/s max speed against a 35 m/s requirement - and every dynamic mode came out qualitatively as expected for a conventional configuration. The more general takeaway is the cross-check itself: sizing a matching plot, modeling it in XFLR5, then verifying both by flight-testing a matched digital twin, and having the neutral point agree to within 3% across the two independent methods, is the actual test of whether the sizing was done right - closer to how this process should always be checked than a Nimbus-specific result.

## What's still open

Takeoff and landing distance (460 m / 390 m) sit above the 300 m constraint line the matching plot was drawn to - not a flyability problem, but a gap between a "minimum field length" constraint and the achieved value once the rest of the sizing is fixed elsewhere. The concrete next step is trimming wing/power loading specifically against the takeoff-run constraint rather than the stall line it's currently pinned to, to bring the two closer together.

---

**References**

- Leifsson, L. et al., *Aircraft Design* (AAE 451 course notes), Computational Design (CODE) Laboratory, Purdue University - [computationaldesignlab.github.io/aircraft-design](https://computationaldesignlab.github.io/aircraft-design/intro.html)
- Young, K., *Conceptual Design of a Fixed-Wing Crop Dusting Unmanned Aerial Vehicle*, M.S. thesis, San José State University, 2016 (advisor: N. Mourtos)
- *Preliminary Flight Test* practical handout, Dept. of Aerospace & Mechanical Engineering, IOE Pulchowk Campus, 2022
- [Download the design poster (PDF)](../assets/downloads/nimbus-poster.pdf)
