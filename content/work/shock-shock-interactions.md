---
{
  "title": "Shock-shock interactions at Mach 3",
  "category": "research",
  "type": "coursework",
  "status": "Completed",
  "thumbnail": "assets/media/work_assets_hypersonics/hero-1-typeII-mach-interaction.png",
  "media_type": "carousel",
  "institution": "IOE Pulchowk Campus",
  "date": "2026",
  "tags": [
    "rhoCentralFoam",
    "Shock Polars",
    "Shock-Shock Interaction"
  ],
  "supporting_media": [
    "assets/media/work_assets_hypersonics/support-typeII-mach-field.png",
    "assets/media/work_assets_hypersonics/support-typeI-total-pressure.png"
  ],
  "links": [
    {
      "label": "Project report (PDF)",
      "url": "/assets/downloads/hypersonics/shock-shock-interactions-report.pdf"
    },
    {
      "label": "Python script",
      "url": "/assets/downloads/hypersonics/shockPolar.py"
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
      "src": "assets/media/work_assets_hypersonics/hero-4-typeI-regular-reflection.png",
      "caption": "Type I (regular) reflection, no Mach stem"
    }
  ],
  "order": 4.1,
  "card_title": "Shock-shock interactions",
  "card_thumbnail": "assets/media/work_assets_hypersonics/hero-1-typeII-mach-interaction.png",
  "thumbnail_fit": "contain",
  "description": "Shock-polar predictions and CFD of intersecting oblique shocks at Mach 3, comparing regular and Mach interactions at ISA 20 km freestream conditions."
}
---

<span id="how-it-was-done" aria-hidden="true"></span>

Shock-polar predictions and CFD of intersecting oblique shocks at Mach 3, comparing regular and Mach interactions at ISA 20 km freestream conditions.

## Setup

`solver`: rhoCentralFoam (Kurganov-Tadmor flux, van Leer reconstruction)

`freestream`: Mach 3, ISA 20 km

`ramps`: Type I at ±15° and Type II at ±30°

## Shock polars and CFD

**Shock-shock interaction classification at Mach 3.** Shock-polar theory was used to predict, ahead of time, whether a pair of intersecting oblique shocks (from ±15° and ±30° ramps) would produce a regular (Type I) reflection or a Mach (Type II) interaction, by checking whether the downstream polars intersect on the weak-shock branch. Both Kantrowitz-limit area ratios were kept under the 1.39 starting limit so the CFD cases would actually start without a normal shock choking the duct. CFD at both deflection angles then confirmed the polar prediction.

<img src="../assets/media/work_assets_hypersonics/support-shockpolar-typeI.png" alt="Shock polar construction for the Type I, ±15 degree case, showing the downstream polars intersecting on the weak-shock branch">
<img src="../assets/media/work_assets_hypersonics/support-shockpolar-typeII.png" alt="Shock polar construction for the Type II, ±30 degree case, showing no intersection on the weak-shock branch">

<vtk-reader href="../content/data/hypersonics/typeI.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Type I: two incident shocks crossing symmetrically into a clean regular reflection, no Mach stem.*

<vtk-reader href="../content/data/hypersonics/typeII.vtp" field="user-defined" colormap="user-defined" initial-colormap="rainbow" interactive="true" clipping="true" threshold="true" height="540"></vtk-reader>
*Type II: the same setup at ±30°, now with a Mach stem, two triple points and a slipstream - switch to the `Ma` field and threshold around 1.0 to pick out the subsonic pocket behind the stem.*

The shock-shock CFD matched the polar predictions cleanly: the ±15° case showed a clean regular reflection with a visible slip line and negligible total-pressure loss, while the ±30° case showed the full signature of a Mach interaction - a near-normal Mach stem, two triple points, a slipstream, and a substantially larger entropy rise across the stem than across either oblique shock.

## Related studies

- [Flow around a cylinder](/work/flow-around-cylinder/)
- [Scramjet intake](/work/scramjet-intake/)
