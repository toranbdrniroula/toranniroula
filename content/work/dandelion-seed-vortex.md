---
title: "Dandelion Seed Vortex Formation"
date: "2026"
---

## How it was done

The pappus-and-seed geometry is modeled as a porous, semi-permeable disk-like body and simulated using `overPimpleDyMFoam` with an overset mesh approach coupled to a `sixDoF` rigid body solver, in collaboration with researchers at the University of Birmingham who supplied the morphological reference data.

The mesh is built around two overlapping regions (a fine, body-fitted inner mesh that travels with the seed, and a coarser stationary background mesh) exchanged at each time step via `donor-acceptor` interpolation. Reynolds numbers in the regime of interest sit well below 1000, so the flow is fully laminar but unsteady, dominated by the formation and shedding of a stable separated vortex ring sitting just above the pappus.

**Key parameters**

`solver`: overPimpleDyMFoam
`turbulence`: laminar
`Re`: ~ O(10²)
`mesh`: overset, ~480k cells

<stl-reader href="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/stl/ascii/slotted_disk.stl" bg-color="#ffffff:#000000" surface-color="#1da1e8" height="380"></stl-reader>

*Placeholder geometry verifying the `<stl-reader>` STL path (drag to rotate, auto-rotates when idle); swap the `href` for the real pappus/seed STL export.*

<stl-reader href="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb" bg-color="#ffffff:#000000" height="380"></stl-reader>

*Placeholder model verifying the same component's glTF/GLB path (baked vertex colors, Draco-ready); swap for the frozen isosurface export once you have one.*

<vtk-reader href="../content/data/sample-vortex-ring.vtp" field="user-defined" colormap="user-defined" interactive="true" clipping="true" threshold="true" height="420"></vtk-reader>

*Placeholder torus mesh with two synthetic scalar fields ("Q" and "azimuth"), verifying the `<vtk-reader>` scalar-field coloring, field-switching, threshold, colormap dropdown, and clip-plane path (drag to orbit; use the field dropdown, threshold sliders, the colormap menu, and the "Show clip plane" checkbox below the viewer); swap the `href` for the real Q-criterion `.vtp` export from ParaView once it exists. Slicing/streamlines are still a planned follow-up.*

## What was learned

The separated vortex ring stabilizes into a near-steady recirculating bubble that sits a fixed distance above the seed regardless of small perturbations in falling orientation, which goes some way toward explaining the seed's passive stability in turbulent ambient air. The drag coefficient extracted from the simulation falls within range of prior experimental measurements on physical pappus models, which was the first checkpoint before trusting the rest of the data.

## What's still open

The current model holds the pappus geometry rigid. Real pappi flex and can partially collapse under load, and capturing that fluid-structure interaction is the next phase of this collaboration.
