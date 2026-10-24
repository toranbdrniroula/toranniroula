---
{
  "title": "Hypersonics and Advanced Propulsion: Shock Interactions and a Scramjet Intake",
  "category": "research",
  "type": "coursework",
  "status": "Completed",
  "thumbnail": "assets/media/work_assets_hypersonics/thumb.png",
  "media_type": "carousel",
  "institution": "IOE Pulchowk Campus",
  "date": "2026",
  "tags": [
    "rhoCentralFoam",
    "Hypersonics",
    "Shock-Shock Interaction",
    "Scramjet Intake Design"
  ],
  "supporting_media": [
    "assets/media/work_assets_hypersonics/support-cylinder-temperature.png",
    "assets/media/work_assets_hypersonics/support-cylinder-streamlines.png",
    "assets/media/work_assets_hypersonics/support-typeII-mach-field.png",
    "assets/media/work_assets_hypersonics/support-typeI-total-pressure.png"
  ],
  "links": [
    {
      "label": "Full report (PDF)",
      "url": "../assets/downloads/hypersonics/hypersonics-advanced-propulsion-report.pdf"
    },
    {
      "label": "Python scripts (Cp, shock polar, intake design)",
      "url": "../assets/downloads/hypersonics/hypersonics-code.zip"
    }
  ],
  "media_fit": "contain",
  "hero_interval": 4500,
  "hero_slides": [
    {
      "src": "assets/media/work_assets_hypersonics/hero-1-typeII-mach-interaction.png",
      "caption": "Type II (Mach) interaction at M∞ = 3 - Mach stem, triple point, and slipstream"
    },
    {
      "src": "assets/media/work_assets_hypersonics/hero-2-cylinder-mach.png",
      "caption": "Mach number field around the M∞ = 6 cylinder"
    },
    {
      "src": "assets/media/work_assets_hypersonics/hero-3-intake-geometry.png",
      "caption": "Single-ramp scramjet intake, sized from oblique-shock design"
    },
    {
      "src": "assets/media/work_assets_hypersonics/hero-4-typeI-regular-reflection.png",
      "caption": "Type I (regular) reflection, no Mach stem"
    }
  ],
  "order": 4,
  "card_title": "Shock interactions and scramjet intakes",
  "card_thumbnail": "assets/media/work_assets_hypersonics/hero-1-typeII-mach-interaction.png",
  "thumbnail_fit": "contain"
}
---

<span id="how-it-was-done" aria-hidden="true"></span>

This started as a homework assignment and I let it run longer than it needed to. It has three parts, all at ISA-20 km freestream conditions and solved with `rhoCentralFoam` (Kurganov-Tadmor flux, van Leer reconstruction) in OpenFOAM.

**Key parameters**

`solver`: rhoCentralFoam (Kurganov-Tadmor, van Leer)
`cylinder`: M∞ = 6, ~40k cells
`shock-shock`: M∞ = 3, Type I (θ = ±15°) and Type II (θ = ±30°) ramps
`scramjet intake`: M∞ = 6, single ramp, design π = 20, design TPR = 0.50

## Mach 6 cylinder: local-inclination theory and CFD

**Cylinder pressure distribution at Mach 6.** Three local-inclination methods - Modified Newtonian theory, the Tangent Wedge method, and Shock-Expansion theory - were used to predict the surface C_p distribution on a circular cylinder, then checked against inviscid CFD on a pear-shaped mesh aligned with the bow shock.

<vtk-reader href="../content/data/hypersonics/cylinder.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="560"></vtk-reader>
*Field data from the actual CFD run, sliced to the case's 2D mid-plane - drag to pan/zoom, switch between Ma, p, T and rho from the field dropdown below, and threshold or clip to isolate the bow shock and entropy layer.*

<span id="what-was-learned" aria-hidden="true"></span>

Modified Newtonian theory tracked the CFD C_p distribution most uniformly across the cylinder's windward face, while the Tangent Wedge and Shock-Expansion methods did better near the shoulder (θ ≈ 40-70°) where the local geometry actually resembles a wedge - all three struggle at the stagnation point itself, where the CFD peak C_p exceeded the Modified Newtonian prediction by about 11%.

<plotly-chart href="../content/data/hypersonics/cylinder_cp_comparison.json" type="scatter" title="Cylinder C_p: CFD vs. local-inclination methods" height="380"></plotly-chart>

## Mach 3 shock interactions: shock polars and CFD

**Shock-shock interaction classification at Mach 3.** Shock-polar theory was used to predict, ahead of time, whether a pair of intersecting oblique shocks (from ±15° and ±30° ramps) would produce a regular (Type I) reflection or a Mach (Type II) interaction, by checking whether the downstream polars intersect on the weak-shock branch. Both Kantrowitz-limit area ratios were kept under the 1.39 starting limit so the CFD cases would actually start without a normal shock choking the duct. CFD at both deflection angles then confirmed the polar prediction.

<img src="../assets/media/work_assets_hypersonics/support-shockpolar-typeI.png" alt="Shock polar construction for the Type I, ±15 degree case, showing the downstream polars intersecting on the weak-shock branch">
<img src="../assets/media/work_assets_hypersonics/support-shockpolar-typeII.png" alt="Shock polar construction for the Type II, ±30 degree case, showing no intersection on the weak-shock branch">

<vtk-reader href="../content/data/hypersonics/typeI.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Type I: two incident shocks crossing symmetrically into a clean regular reflection, no Mach stem.*

<vtk-reader href="../content/data/hypersonics/typeII.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Type II: the same setup at ±30°, now with a Mach stem, two triple points and a slipstream - switch to the `Ma` field and threshold around 1.0 to pick out the subsonic pocket behind the stem.*

The shock-shock CFD matched the polar predictions cleanly: the ±15° case showed a clean regular reflection with a visible slip line and negligible total-pressure loss, while the ±30° case showed the full signature of a Mach interaction - a near-normal Mach stem, two triple points, a slipstream, and a substantially larger entropy rise across the stem than across either oblique shock.

## Mach 6 scramjet intake: design, inviscid flow and RANS

**A single-ramp scramjet intake at Mach 6.** Given a target static pressure ratio (π = 20) and a 50 mm isolator height, the oblique-shock relations and θ-β-M equation were solved simultaneously for the ramp angle (14.15°) and resulting geometry (1.026 m ramp length, 0.301 m capture height). Both an inviscid and a RANS (k-ω SST) simulation of the resulting intake were run to check the design against CFD.

<vtk-reader href="../content/data/hypersonics/intake.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Inviscid intake field (leading-edge shock, cowl shock, shock-on-lip condition) - the RANS run below shows the same geometry with a boundary layer.*

<img src="../assets/media/work_assets_hypersonics/support-rans-intake-mach.png" alt="RANS Mach number field on the scramjet intake, showing boundary layer growth and a small separation bubble at the cowl shock impingement">
<img src="../assets/media/work_assets_hypersonics/support-intake-centerline-totalp.png" alt="Centerline total pressure profile through the intake, showing the two shock-induced pressure drops">

For the scramjet intake, the inviscid CFD matched the design-point total pressure recovery and static pressure ratio to within 0.4%, confirming the design procedure was internally consistent; the RANS case then showed the boundary-layer displacement effect you'd expect - a thickened boundary layer at the shoulder, a small separation bubble where the cowl shock impinges, and the leading-edge shock landing slightly off the ideal inviscid impingement point as a result.

<span id="what-s-still-open" aria-hidden="true"></span>

## Multi-ramp compression and boundary-layer uncertainty

The single-ramp intake's total pressure recovery (0.50) is characteristic of one strong oblique shock at Mach 6 - a two- or three-ramp system would split the compression across weaker shocks and recover meaningfully more total pressure, at the cost of a longer, more complex intake. That multi-ramp redesign, plus checking the RANS boundary-layer prediction's sensitivity to the fully-turbulent assumption (the flow may not actually be turbulent over the whole ramp at these conditions), are the natural next steps if this keeps growing past assignment scope.

