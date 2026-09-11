---
title: "pyrsd: a Python Library for Rainbow Schlieren Deflectometry"
date: "2025-2026"
---

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19219233.svg)](https://doi.org/10.5281/zenodo.19219233)

## How it was built

Rainbow Schlieren Deflectometry produces raw material that's genuinely beautiful and completely useless on its own: a color image whose hue encodes a light ray's deflection, and nothing that turns that hue into a physical quantity without a calibration step you have to build yourself. `pyrsd` is that calibration and reconstruction pipeline, written for the [wall-jet thesis](case-file.html?slug=compressible-wall-jet-rsd&category=research) so the same steps didn't have to be re-derived by hand for every image set.

The library has three jobs: read a series of filter-calibration images (the graded color filter translated through known displacements on a stage) and fit a hue-vs-displacement curve from them; take a raw flow image and a "taring" (no-flow) reference image and use that curve to compute a per-pixel displacement field, and from it a density-gradient field; and reconstruct the underlying density field from the gradient, either by direct line integration along the dominant gradient direction or by solving a Poisson equation over the field. A separate small tool, ImageTool, handles the image preprocessing (cropping, alignment, background subtraction) that has to happen before any of that math is meaningful.

**Key parameters**

`inputs`: filter calibration images + flow/taring image pairs
`outputs`: displacement field, density-gradient field, reconstructed density field
`reconstruction`: line integration or Poisson solve
`stack`: NumPy, SciPy, OpenCV

## What was learned

Most of the real difficulty here wasn't the reconstruction math, it was everything upstream of it: how much calibration drift a slide-film filter accumulates between sessions, how sensitive the hue-to-displacement mapping is to ambient lighting and camera white balance, and how much of the apparent "signal" in a naive first pass turned out to be noise once the calibration was tightened up. Getting the natural-convection validation case (a known, well-understood flow) to reconstruct correctly before pointing the pipeline at the actual wall jet was what turned this from a script into something I'd trust.

## What's still open

Abel inversion for genuinely axisymmetric flows (a candle plume was the test case, and remains unsolved cleanly within the library) is the most immediate gap. Beyond that, the library doesn't yet do anything with time-resolved image sequences, so there's no direct path from it to schlieren imaging velocimetry, which is one of the directions the thesis's future-work section points toward.
