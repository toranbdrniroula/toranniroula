---
title: "OpenFOAM CFD for a Fixed-Wing UAV, and the Effect of Blended Winglets"
date: "2025"
---

## How it was done

This was a research-migration project for the FOSSEE Fellowship: reproduce a published ANSYS Fluent study of a small fixed-wing UAV (S.M.A. Meftah et al., inverted V-tail, twin boom) entirely in OpenFOAM, then push past replication into a design question the original paper didn't ask. The half-geometry (exploiting longitudinal symmetry at zero sideslip) was built in CATIA from the paper's published dimensions and proportions where exact figures weren't given, exported as an STL, and meshed with `snappyHexMesh` — surface refinement on the airframe, a refinement box over the wake, and boundary layer prism layers.

`simpleFoam` (steady-state, incompressible) with the Spalart-Allmaras turbulence model was used throughout, matching the reference study's turbulence closure. A grid convergence study across three mesh densities (1.04M / 2.60M / 6.50M cells) gave a Grid Convergence Index under 1% between the medium and fine grids, so the medium mesh was used for the full angle-of-attack sweep. Lift and drag coefficients were extracted at runtime with the `forceCoeffs` function object.

With the baseline validated against Meftah et al. (within about 13% in C_L and 22% in C_D at the highest angle of attack tested, closer through the linear range), the study then extended to a question the original work never addressed: does a blended winglet actually help this airframe, and does cant angle matter? Two winglet geometries, at 45° and 90° cant angles, were added to the same baseline wing and re-meshed and re-run identically.

**Key parameters**

`solver`: simpleFoam
`turbulence`: Spalart-Allmaras
`mesh`: snappyHexMesh, medium grid (2.60M cells) selected after a 3-level GCI study
`freestream`: 20 m/s, Re ≈ 0.315 × 10⁶

## What was learned

Both winglet configurations improved lift-to-drag ratio over the baseline across the angle-of-attack sweep, and Q-criterion isosurfaces confirmed why: the winglet acts as a physical barrier to spanwise flow leakage around the wingtip, visibly shrinking the wingtip vortex compared to the baseline. The 45° cant angle outperformed the 90° configuration, giving a maximum L/D improvement of 14.95% over the baseline (versus 10.9% for the 90° winglet), despite both configurations adding a small amount of parasitic drag from the wing extension needed to blend the winglet in cleanly.

## What's still open

Everything here is steady-state, so the study says nothing about unsteady gust response or genuinely time-resolved vortex dynamics — a natural next step flagged in the report itself. The fully-turbulent assumption in Spalart-Allmaras is also a known limitation at this Reynolds number; if the boundary layer stays laminar over a meaningful fraction of the ramp-like regions of the airframe, skin friction is likely overestimated. A dedicated winglet-shape optimization (surrogate modeling or CFD-in-the-loop) is the obvious extension the fellowship's timeline didn't allow for.
