---
title: "Dandelion Seed Vortex Formation: Resolved-Filament CFD of a Falling Pappus"
date: "2026"
---

A dandelion seed weighs about half a milligram, drifts down at a few tenths of a metre per second, and somehow stays upright and stable in air that is rarely still. The reason is not the seed body, it is the pappus: a 14 mm parachute of 42 hair-thin filaments that is more than 90% empty space. A structure that porous should barely resist the flow at all, and yet it produces enough drag to hold the seed aloft. In 2018 Cummins et al. showed why: the pappus sheds a *separated vortex ring* that sits a short distance above it, and that detached ring, not the filaments themselves, is doing most of the aerodynamic work.

This case file follows my attempt to reproduce that ring computationally, filament by filament, and then to let the seed actually fall through it. It is an **ongoing** study in collaboration with the University of Birmingham, so this page is a snapshot of working results rather than a finished paper: setup details that are still in flux, and numbers I don't yet trust enough to quote, are deliberately left out.

**Key parameters**

`solver (falling seed)`: overPimpleDyMFoam + sixDoF rigid-body motion
`solver (fixed seed)`: pimpleFoam
`flow`: laminar, unsteady, incompressible
`mesh`: ~5M cells, every filament geometrically resolved (no porous-media model)
`Re`: ≈ 684 (fixed-seed case); O(10²) for the falling seed
`geometry`: 14 mm pappus, 42 radial filaments around a central hub

### Interactive geometry

The pappus model exactly as it is meshed, filaments and hub, drag to rotate, scroll to zoom. It is tilted here so the disk faces the camera; in the simulation the seed falls along the disk normal.

<stl-reader href="../assets/media/work_assets_dandelion_seed/dandelion-seed.stl" bg-color="#ffffff:#000000" surface-color="#1da1e8" height="420"></stl-reader>
<span class="md-caption">The 14 mm pappus used in the simulations: 42 straight filaments radiating from a thin central hub. The whole model is 60 µm thick, so at this scale it is essentially a flat structure.</span>

## Why resolve every filament

The tempting shortcut is to treat the pappus as a porous disk and let a permeability term stand in for the filaments. For drag alone that can work. For the vortex it is risky, because the separated vortex ring exists precisely because fluid *bleeds through* the gaps between filaments, and a porous-media term smears that bleed flow into something much smoother than the real jets issuing from between 42 discrete hairs. So here the filaments are real geometry, about 0.04 mm across, and the mesh has to follow them.

A low Reynolds number is what keeps this tractable. At Re of a few hundred the flow is laminar, so there is no turbulence model to choose or to doubt, but it is still unsteady, and the problem becomes one of resolving very thin solid features inside a large wake.

## Governing equations

Unsteady, incompressible, laminar Navier-Stokes for the fluid:

$$\nabla \cdot \mathbf{u} = 0, \qquad \frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u}\cdot\nabla)\mathbf{u} = -\frac{1}{\rho}\nabla p + \nu\nabla^2\mathbf{u}$$

with the Reynolds number built from the pappus diameter, $Re = U D / \nu$. In the falling-seed case the seed is a rigid body whose motion comes from integrating the fluid load on it:

$$m\,\dot{\mathbf{v}} = \mathbf{F}_{\text{fluid}} + m\mathbf{g}, \qquad \mathbf{I}\,\dot{\boldsymbol{\omega}} + \boldsymbol{\omega}\times(\mathbf{I}\boldsymbol{\omega}) = \mathbf{M}_{\text{fluid}}$$

OpenFOAM's `sixDoF` solver integrates these every time step with all six degrees of freedom free, so the seed is allowed to tilt, rock and translate sideways as well as fall.

## Two cases, one geometry

The study runs the same pappus in two different ways, and the split is deliberate.

**Fixed seed.** The pappus is held still in a uniform stream (`pimpleFoam`, Re ≈ 684). Nothing can move, so any vortex that forms is purely a property of the flow through the filaments. This is the clean validation case: it can be compared against published drag data on pappus-like bodies without the added complication of a moving mesh.

**Falling seed.** The pappus is released from rest in still fluid and left to fall (`overPimpleDyMFoam` with `sixDoF`). This is the case that matters physically, because the seed's own motion and the wake it creates feed back on each other. It needs an overset mesh: a fine, body-fitted mesh that travels with the seed, sitting inside a coarser stationary background mesh, with the two coupled by interpolation at every step.

## Mesh

<div class="md-figure-row">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-mesh-overview.png" alt="Surface mesh of the full pappus showing all 42 filaments radiating from the hub">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-mesh-hub-zoom.png" alt="Zoomed view of the surface mesh at the hub and the filament roots">
</div>
<span class="md-caption">The full pappus (left) and the hub-filament junction (right). Each filament is only a few cells across its diameter near the root, and the hub region carries the finest surface refinement because that is where the filaments meet the disk and the geometry is least forgiving.</span>

The mesh sits at roughly five million cells. The difficulty is not the count, it is the aspect ratio of the problem: filaments about 0.04 mm across inside a wake several diameters long means the refinement has to be graded carefully, and the thin junctions where filaments meet the hub are the places where mesh quality, and therefore time-step stability, is won or lost.

## The fixed seed: a vortex pair that refuses to attach

<div class="md-figure-row">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-static-cd-vs-time.png" alt="Drag coefficient versus time for the fixed seed at Re 684, starting near 22 and settling to about 5.6">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-static-drag-force-vs-time.png" alt="Drag force versus time for the fixed seed, starting near 39 micronewtons and settling to about 10 micronewtons">
</div>
<span class="md-caption">Drag coefficient (left) and drag force (right) on the fixed seed. The spike at t = 0 is the impulsive start of the stream, not physics; after about 0.02 s the curves are smooth, and by 0.15 s C_d is near 5.6 and still easing down slowly rather than flat.</span>

Early comparison of the drag against published values for pappus-like bodies is encouraging, particularly given the modest cell count. I am not putting a number against a literature value on this page yet: the fixed-seed case is being repeated at several Reynolds numbers, and a single-Re agreement says less than a trend does.

The flow field is where the interesting part is. Slicing through the symmetry plane, the fluid that does not go through the pappus is forced around it, and a pair of counter-rotating vortices forms above the disk.

<hero-carousel interval="3000" label="Fixed-seed flow field at Re 684, three views of the same vortex pair" fit="contain">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-static-uy-streamlines.png" alt="Streamlines over a vertical velocity colour map for the fixed seed" data-caption="Vertical velocity with in-plane streamlines. The blue region above the pappus is reversed flow, and the streamlines close into two recirculating cores.">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-static-vorticity-z.png" alt="Out-of-plane vorticity with streamlines for the fixed seed" data-caption="Out-of-plane vorticity. The two cores carry opposite signs, as a symmetric vortex ring cut by a plane should, on a colour scale spanning ±300 1/s.">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-static-lic.png" alt="Line-integral-convolution rendering of the flow around the fixed seed" data-caption="Line-integral-convolution rendering of the same slice: the recirculating bubble is closed, narrow, and sits clear of the pappus.">
</hero-carousel>
<span class="md-caption">Three views of one mid-plane slice. The vortex cores sit roughly a third of a diameter above the pappus and close to the axis, well inboard of the rim, with a pocket of reversed flow between them.</span>

That position is the signature of a *separated* vortex ring. It is not stuck to the pappus and it is not shed away downstream: it is a stable standoff bubble. Getting to this reading took some care. An early look at the same flow suggested an attached recirculation zone, and what resolved it was comparing against a solid disk.

## A solid-disk control

If the ring really depends on bleed flow through the filaments, then a disk with no gaps should look different. Running the same kind of analysis on a solid disk shows that it does.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-flatdisk-umag-streamlines.png" alt="Velocity magnitude and streamlines around a solid flat disk, recirculation cores sitting at and just outboard of the rim">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-flatdisk-q-uy.png" alt="Q-criterion isosurface around a solid flat disk, rings hugging the disk, coloured by vertical velocity">
</div>
<span class="md-caption">Solid-disk control: streamlines (left) and Q-criterion isosurface (right). The recirculation forms at and just outboard of the rim, and the vorticity wraps the disk edge in rings, rather than collecting into a compact bubble on the axis.</span>

The contrast is the point. On the solid disk the vorticity is generated at the edge and stays attached to it. On the pappus the cores migrate inboard toward the axis and lift off, which is what you would expect if fluid passing through the gaps is pushing the recirculation bubble away from the body. It is a qualitative argument, not yet a measurement, but it is the check that moved the identification from "attached recirculation" to "separated vortex ring".

## The falling seed

Releasing the pappus and letting `sixDoF` move it changes the problem. The seed starts from rest and accelerates, so the drag starts at zero and has to build.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-6dof-force.png" alt="Force components on the falling seed versus time, vertical force rising to about 9.7 micronewtons, horizontal components zero">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-6dof-moment.png" alt="Moment components on the falling seed versus time, growing in x and z with high-frequency oscillation, y component near zero">
</div>
<span class="md-caption">Force (left) and moment (right) on the falling seed over its first 0.23 s. The vertical force climbs smoothly and begins to flatten near 9.7 µN; the lateral forces stay at zero. The moments about the in-plane axes are tiny, order 10⁻¹¹ N·m, but they grow and turn noisy after about 0.07 s.</span>

The force history is smooth and physically sensible: a monotonic build-up with no lateral force. The moments are a different story, and I would rather say what I do and do not know about them than smooth it over. They grow in the two in-plane components while the component about the disk normal stays near zero, which is the signature of the seed beginning to tilt. But the oscillation superimposed on that trend is large, and it appears right where the vortex structure is forming. What I cannot yet say is how much of it is genuine unsteady loading from the evolving wake and how much is interpolation noise from the overset coupling acting on 42 very thin bodies.

### Does letting the seed rotate matter?

To separate rotation from translation, a companion run locks the rotational degrees of freedom so the seed can only move straight down.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-norot-force.png" alt="Force components versus time with rotation constrained, vertical force rising to about 9.6 micronewtons">
  <img src="../assets/media/work_assets_dandelion_seed/dandelion-norot-streamlines-umag.png" alt="Velocity magnitude with streamlines for the rotation-constrained falling seed showing two large recirculation loops flanking a central high-speed column">
</div>
<span class="md-caption">Rotation-locked run: force history (left) and the flow field (right), with a central high-speed column through the pappus flanked by large closed recirculation loops.</span>

Over the time both runs cover, the vertical force history of the free-rotation and rotation-locked cases is effectively identical, including a small step near t ≈ 0.18 s that appears in both. So in the first fifth of a second, rotation has not yet changed the drag, and that small step is a feature of the flow, not of the rigid-body coupling. That is also roughly when the separated ring first becomes unambiguous in the field data.

### The vortex in three dimensions

<img src="../assets/media/work_assets_dandelion_seed/dandelion-6dof-q-uy.png" alt="Q-criterion isosurface above the pappus forming a bowl-shaped vortex ring, coloured by vertical velocity">
<span class="md-caption">Q-criterion isosurface for the falling seed, coloured by vertical velocity. The ring forms as a closed bowl hovering over the pappus. The corrugated red sheet around the pappus is the isosurface hugging the individual filaments, which is the detail a porous-media model would have averaged away.</span>

<img src="../assets/media/work_assets_dandelion_seed/dandelion-6dof-streamlines-q.png" alt="Streamlines around the falling seed together with the Q-criterion isosurface, showing large closed recirculation loops on either side">
<span class="md-caption">The same ring with streamlines added. The closed loops either side of the central column are far larger than the pappus itself, which is why the wake of a seed this small is a surprisingly large-scale flow.</span>

<video-embed src="../assets/media/work_assets_dandelion_seed/dandelion-6dof-q.mp4" poster="../assets/media/work_assets_dandelion_seed/dandelion-6dof-q-poster.jpg" label="Q-criterion isosurface of the falling seed, camera orbit" height="340" fit="contain" autoplay="true" loop="true" controls="false"></video-embed>
<span class="md-caption">Q-criterion isosurface of the falling seed, coloured by vertical velocity, seen while the camera moves around it.</span>

## What was learned

A resolved-filament model of the dandelion pappus, at about five million cells, does produce a compact, separated vortex ring standing off the pappus, and it does so in both the fixed-seed and the falling-seed setups. The solid-disk control behaves differently in the way the bleed-flow explanation predicts: its vorticity stays attached to the rim, where the pappus's cores migrate to the axis and lift away. In the first 0.2 s of the falling case, rotation does not measurably change the drag.

None of this is a surprise to anyone who has read Cummins et al. The point of redoing it is that the same mesh and solver setup now sits on both sides of the question: a fixed body for validation, and a body that falls, tilts, and sheds a wake of its own.

## What's still open

The falling case has so far covered about 0.23 s of physical time, which is not enough to say whether the seed reaches a steady fall speed, and I am deliberately not claiming one. The force is flattening, but the drag-versus-weight balance that defines terminal velocity needs a longer run before it means anything. The moments are the other open question: whether the growing tilting moment is a real instability of the falling pappus or numerical noise from the overset coupling is exactly what the rotation-free comparison cannot settle on its own, and it needs a convergence check on the overset interpolation to answer.

Beyond that, the fixed-seed validation needs to be repeated across a range of Reynolds numbers before a single drag comparison can be called a result, and the rigid-pappus assumption is the largest physical simplification left. Real filaments flex and the pappus can collapse partially under load, so capturing that fluid-structure interaction is the natural next phase of the collaboration.

---

This work is carried out in collaboration with the University of Birmingham, whose group supplied the morphological reference data and the HPC access that makes a mesh of this size practical. My thanks to Dr. Chandan Bose for supervision.
