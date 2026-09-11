---
title: Overset Meshing, Explained the Way I Wish Someone Had Explained It to Me
date: 2026-05-14
excerpt: Why you'd bother with two overlapping meshes instead of one, and what actually happens at the boundary between them.
---

Most of the meshes I built in my first two years of CFD were single, conforming meshes: one watertight domain, refined where I needed resolution, coarsened where I didn't. That works fine until the geometry inside the domain needs to move.

The freely-falling disk case is a good example of why a single mesh stops being enough. The disk falls, tumbles, and drifts sideways as it falls; its orientation isn't known in advance, and deforming a single conforming mesh to follow that motion, time step after time step, either destroys mesh quality or requires re-meshing constantly. Neither is acceptable for a simulation meant to run for thousands of time steps.

## The overset idea

An overset mesh sidesteps this by using two (or more) meshes that overlap rather than conform to each other. A fine, body-fitted mesh travels with the disk. A coarser background mesh fills the rest of the domain and stays fixed in space. At every time step, cells near the overlap region are classified as either "donor" cells, which supply information, or "acceptor" cells (sometimes called "hole" cells), which receive it through interpolation.

The actual coupling happens through a donor-acceptor interpolation scheme: each acceptor cell looks at the donor cells from the other mesh that overlap its location and interpolates the flow variables it needs from them. As the body mesh moves, this donor-acceptor relationship is recomputed every time step, so the two meshes stay correctly coupled even as their physical overlap region shifts.

## What actually goes wrong

In practice, the place this breaks is the hole-cutting step, deciding which background cells fall inside the moving body and should be excluded from the solve. Get the hole-cutting tolerance wrong and you either leave a sliver of background cells trying to solve inside solid geometry, or you cut too aggressively and create a gap with no valid donor cells on either side. Both show up as the same symptom: the solver either diverges outright or quietly produces garbage near the body that looks plausible until you check it against something you trust.

The fix, in my experience, has mostly been patience: visualizing the donor-acceptor cell classification directly, every few time steps, rather than trusting that a clean-looking mesh at t=0 stays clean once the body starts moving.

This is still very much in progress on my end: the disk case has a fair number of unresolved snapping and layer-extrusion issues left to work through before I'd call it converged.
