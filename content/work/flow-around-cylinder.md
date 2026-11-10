---
{
  "title": "Flow around a cylinder at Mach 6",
  "category": "research",
  "type": "coursework",
  "status": "Completed",
  "thumbnail": "assets/media/work_assets_hypersonics/hero-2-cylinder-mach.png",
  "media_type": "carousel",
  "institution": "IOE Pulchowk Campus",
  "date": "2026",
  "tags": [
    "rhoCentralFoam",
    "Hypersonics",
    "Local-Inclination Methods"
  ],
  "supporting_media": [
    "assets/media/work_assets_hypersonics/support-cylinder-temperature.png"
  ],
  "links": [
    {
      "label": "Project report (PDF)",
      "url": "/assets/downloads/hypersonics/flow-around-cylinder-report.pdf"
    },
    {
      "label": "Python script",
      "url": "/assets/downloads/hypersonics/cp_dist.py"
    }
  ],
  "media_fit": "contain",
  "hero_interval": 4500,
  "hero_slides": [
    {
      "src": "assets/media/work_assets_hypersonics/hero-2-cylinder-mach.png",
      "caption": "Mach number field around the M∞ = 6 cylinder"
    },
    {
      "src": "assets/media/work_assets_hypersonics/support-cylinder-streamlines.png",
      "caption": "Streamlines around the cylinder and its leeward recirculation"
    }
  ],
  "order": 4,
  "card_title": "Flow around a cylinder",
  "card_thumbnail": "assets/media/work_assets_hypersonics/hero-2-cylinder-mach.png",
  "thumbnail_fit": "contain",
  "description": "Pressure distribution and flow around a circular cylinder at Mach 6, comparing local-inclination predictions with inviscid CFD at ISA 20 km freestream conditions."
}
---

<span id="how-it-was-done" aria-hidden="true"></span>

Pressure distribution and flow around a circular cylinder at Mach 6, comparing local-inclination predictions with inviscid CFD at ISA 20 km freestream conditions.

## Setup

`solver`: rhoCentralFoam (Kurganov-Tadmor flux, van Leer reconstruction)

`freestream`: Mach 6, ISA 20 km

`mesh`: approximately 40,000 cells, pear-shaped domain aligned with the bow shock

## Local-inclination theory and CFD

**Cylinder pressure distribution at Mach 6.** Three local-inclination methods - Modified Newtonian theory, the Tangent Wedge method, and Shock-Expansion theory - were used to predict the surface C_p distribution on a circular cylinder, then checked against inviscid CFD on a pear-shaped mesh aligned with the bow shock.

<vtk-reader href="../content/data/hypersonics/cylinder.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="560"></vtk-reader>
*Field data from the actual CFD run, sliced to the case's 2D mid-plane - drag to pan/zoom, switch between Ma, p, T and rho from the field dropdown below, and threshold or clip to isolate the bow shock and entropy layer.*

<span id="what-was-learned" aria-hidden="true"></span>

Modified Newtonian theory tracked the CFD C_p distribution most uniformly across the cylinder's windward face, while the Tangent Wedge and Shock-Expansion methods did better near the shoulder (θ ≈ 40-70°) where the local geometry actually resembles a wedge - all three struggle at the stagnation point itself, where the CFD peak C_p exceeded the Modified Newtonian prediction by about 11%.

<plotly-chart href="../content/data/hypersonics/cylinder_cp_comparison.json" type="scatter" title="Cylinder C_p: CFD vs. local-inclination methods" height="380"></plotly-chart>

## Related studies

- [Shock-shock interactions](/work/shock-shock-interactions/)
- [Scramjet intake](/work/scramjet-intake/)
