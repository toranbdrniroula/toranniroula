---
title: "Surface Heating Effects on a Compressible Wall Jet, Imaged with Rainbow Schlieren"
date: "2025-2026"
---

## How it was done

The thesis question was simple to state and hard to build for: does surface heating measurably change the density-gradient field of a compressible wall jet, and can that change be imaged quantitatively rather than just seen? Answering it meant building almost the entire measurement chain from nothing: a Z-type (twin-mirror) schlieren rig, a 3D-printed converging nozzle feeding a compressible jet, and a PID-controlled, Peltier-heated flat plate the jet runs along.

Standard schlieren only gives a greyscale image, the first derivative of the refractive index with no sign or magnitude information worth trusting quantitatively. Rainbow Schlieren Deflectometry (RSD) fixes that by replacing the usual knife-edge cutoff with a graded color filter at the focal plane, so the direction and magnitude of a light ray's deflection through a density gradient gets encoded directly as hue and saturation in the captured image. The filters themselves were designed on an HSI (hue-saturation-intensity) color scheme and printed on E6 slide film, then calibrated by translating them through known fixed distances on a stage and fitting a hue-vs-displacement curve.

Two setups were run: a "plumbing" case to characterize the compressible jet facility itself (meshed and solved with realizable k-epsilon and a standard wall function), and the actual wall-jet case over the heated plate (k-omega SST). A natural-convection case over a heated vertical plate, imaged with the same rig, served as a lower-speed validation problem before trusting the RSD pipeline on the compressible jet.

**Key parameters**

`technique`: Rainbow Schlieren Deflectometry (Z-type, twin-mirror)
`facility`: 3D-printed converging nozzle + PID/Peltier heated flat plate
`CFD`: realizable k-epsilon (plumbing), k-omega SST (wall jet)
`processing`: pyrsd (custom Python library)

## What was learned

Turning raw color images into trustworthy density-gradient fields took most of the effort. The full workflow: filter calibration, spatial calibration, converting each color image into a displacement field via the calibration curve, and reconstructing the density field from that displacement field by line integration or a Poisson solver, is what `pyrsd` (its own [write-up is here](case-file.html?slug=pyrsd-library&category=research)) exists to do repeatably. The natural-convection validation case against a heated vertical plate gave temperature profiles from the reconstructed density gradient (assuming isobaric flow) that matched expectations at both plate temperatures tested, which was the checkpoint that made me trust the pipeline enough to point it at the actual wall jet. The mean density-gradient field for the wall-jet case compared reasonably against the 2D CFD at 1 bar, 60°C, and the facility's heating and pressure supply behaved predictably enough to sweep both temperature and supply pressure and see consistent trends in both.

Building the physical facility surfaced its own lessons, separate from the imaging: supply-line pressure losses that had to be characterized before the jet conditions could be trusted, RSD filter fabrication that took several iterations to get a clean, low-noise HSI gradient onto E6 film, and how sensitive a Z-type schlieren alignment is to anything moving in the lab.

## What's still open

Line-of-sight integration is the fundamental limitation of any planar schlieren technique: the RSD field is a path-integrated quantity, so extracting a genuinely 2D or 3D density field from it needs either an axisymmetric assumption (not valid for this jet) or a full tomographic reconstruction from multiple viewing angles (not attempted here). Direct velocity measurement, IR thermography of the plate (attempted but not completed within the project's timeline), and a full Nusselt-number characterization of the heated wall jet are the natural next steps, along with extending `pyrsd` toward Abel inversion for genuinely axisymmetric flows like a candle plume, where the current implementation still has open problems. A 3D LES of the wall jet and schlieren imaging velocimetry (SIV) are further out but the direction I'd want this to go if it continues.
