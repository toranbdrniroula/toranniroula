---
{
  "title": "Scramjet intake design at Mach 6",
  "category": "research",
  "type": "coursework",
  "status": "Completed",
  "thumbnail": "assets/media/work_assets_hypersonics/hero-3-intake-geometry.png",
  "media_type": "carousel",
  "institution": "IOE Pulchowk Campus",
  "date": "2026",
  "tags": [
    "rhoCentralFoam",
    "Scramjet Intake Design",
    "Oblique Shocks",
    "RANS"
  ],
  "supporting_media": [],
  "links": [
    {
      "label": "Project report (PDF)",
      "url": "/assets/downloads/hypersonics/scramjet-intake-report.pdf"
    },
    {
      "label": "Python script",
      "url": "/assets/downloads/hypersonics/intake.py"
    }
  ],
  "media_fit": "contain",
  "hero_interval": 4500,
  "hero_slides": [
    {
      "src": "assets/media/work_assets_hypersonics/hero-3-intake-geometry.png",
      "caption": "Single-ramp scramjet intake, sized from oblique-shock design"
    },
    {
      "src": "assets/media/work_assets_hypersonics/support-rans-intake-mach.png",
      "caption": "RANS Mach number field with boundary-layer growth and shock impingement"
    }
  ],
  "order": 4.2,
  "card_title": "Scramjet intake",
  "card_thumbnail": "assets/media/work_assets_hypersonics/hero-3-intake-geometry.png",
  "thumbnail_fit": "contain",
  "description": "Oblique-shock design and CFD validation of a single-ramp scramjet intake at Mach 6, comparing inviscid and RANS solutions at ISA 20 km freestream conditions."
}
---

<span id="how-it-was-done" aria-hidden="true"></span>

Oblique-shock design and CFD validation of a single-ramp scramjet intake at Mach 6, comparing inviscid and RANS solutions at ISA 20 km freestream conditions.

## Setup

`solver`: rhoCentralFoam (Kurganov-Tadmor flux, van Leer reconstruction)

`freestream`: Mach 6, ISA 20 km

`design`: pressure ratio 20, total pressure recovery 0.50, isolator height 50 mm

## Design, inviscid flow and RANS

**A single-ramp scramjet intake at Mach 6.** Given a target static pressure ratio (π = 20) and a 50 mm isolator height, the oblique-shock relations and θ-β-M equation were solved simultaneously for the ramp angle (14.15°) and resulting geometry (1.026 m ramp length, 0.301 m capture height). Both an inviscid and a RANS (k-ω SST) simulation of the resulting intake were run to check the design against CFD.

<vtk-reader href="../content/data/hypersonics/intake.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Inviscid intake field (leading-edge shock, cowl shock, shock-on-lip condition) - the RANS run below shows the same geometry with a boundary layer.*

<img src="../assets/media/work_assets_hypersonics/support-rans-intake-mach.png" alt="RANS Mach number field on the scramjet intake, showing boundary layer growth and a small separation bubble at the cowl shock impingement">
<img src="../assets/media/work_assets_hypersonics/support-intake-centerline-totalp.png" alt="Centerline total pressure profile through the intake, showing the two shock-induced pressure drops">

For the scramjet intake, the inviscid CFD matched the design-point total pressure recovery and static pressure ratio to within 0.4%, confirming the design procedure was internally consistent; the RANS case then showed the boundary-layer displacement effect you'd expect - a thickened boundary layer at the shoulder, a small separation bubble where the cowl shock impinges, and the leading-edge shock landing slightly off the ideal inviscid impingement point as a result.

<span id="what-s-still-open" aria-hidden="true"></span>

## Multi-ramp compression and boundary-layer uncertainty

The single-ramp intake's total pressure recovery (0.50) is characteristic of one strong oblique shock at Mach 6 - a two- or three-ramp system would split the compression across weaker shocks and recover meaningfully more total pressure, at the cost of a longer, more complex intake. That multi-ramp redesign, plus checking the RANS boundary-layer prediction's sensitivity to the fully-turbulent assumption (the flow may not actually be turbulent over the whole ramp at these conditions), are the natural next steps if this keeps growing past assignment scope.

## Related studies

- [Flow around a cylinder](/work/flow-around-cylinder/)
- [Shock-shock interactions](/work/shock-shock-interactions/)
