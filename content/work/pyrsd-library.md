---
title: "pyrsd: a Python Library for Rainbow Schlieren Deflectometry"
date: "2025-2026"
---

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19219233.svg)](https://doi.org/10.5281/zenodo.19219233)

Classical schlieren - a point light source, two mirrors, a knife edge cutting the decollimated beam - has been the workhorse way to *see* a density gradient since the 19th century, and Gary Settles' book remains the standard reference for why it works and what it can and can't tell you. What it can't tell you, in its plain monochrome form, is much: a knife edge collapses the deflection of every light ray down to a single brightness value, so you get a picture of where the gradient is large, not a measurement of what it actually is. Ajay K. Agrawal's group replaced the knife edge with a continuously graded color filter at the decollimating focal plane, so that a ray's deflection is encoded as a hue shift instead of a brightness change - Rainbow Schlieren Deflectometry (RSD). That one substitution turns schlieren from a visualization technique into a quantitative one, and it's the technique our RSD rig at the Flow Visualization Lab (IOE Pulchowk Campus) is built around, developed for the [wall-jet thesis](case-file.html?slug=compressible-wall-jet-rsd&category=research).

The catch is that a hue image is still just a color image. Nothing about it is a displacement, a density, or a temperature until it's been calibrated, differenced against a no-flow reference, and pushed through an optical-to-thermodynamic inversion chain. `pyrsd` is that chain, written as an open-source Python package so the same seven or eight steps didn't have to be re-derived and re-scripted by hand for every image set the rig produced.

**Key parameters**

`inputs`: filter-calibration image sequence + background/flow image pairs (TIFF/PNG/JPEG/BMP, 8- or 16-bit)
`core outputs`: hue field &rarr; displacement field &rarr; density-gradient field &rarr; density &rarr; temperature/pressure field
`reconstruction`: 1-D cumulative integration, 2-D Poisson solve, or inverse Abel transform
`stack`: NumPy, SciPy, OpenCV; optional PyAbel and scikit-image extras
`design rule`: every filesystem call lives in one I/O module; every other module is a pure function on NumPy arrays

## The optical setup the library is built for

<img src="../assets/media/work_assets_pyrsd/pyrsd-processing-workflow.png" alt="pyrsd processing workflow: from Z-type schlieren rig through background and flow field capture, filter calibration, hue extraction, displacement field, density gradient field, and integrated density field">
<span class="md-caption">The full chain the library formalizes: a Z-type twin-mirror rig produces background and flow-field image stacks and, separately, a filter-calibration sequence; hue extraction and the calibration curve turn both into a displacement field, which the optics relations convert to a density-gradient field, and integration recovers density.</span>

The same Z-type (twin-mirror) rig runs two acquisitions. One is the actual measurement: a background (no-flow, or "taring") image and a stack of flow images through the color filter, both hue-coded by ray deflection. The other is a calibration: the filter itself is stepped through known physical displacements on a translation stage, and an image is captured at every step, building up a hue-vs-displacement lookup that's specific to that filter and that day's alignment. Everything downstream of that pair of acquisitions - subtracting, calibrating, integrating - is what `pyrsd` automates.

## Package architecture

The layout mirrors the pipeline directly, with a single rule enforced throughout: **all filesystem interaction is isolated in `pyrsd.utils.io`**; every other module is a pure function over NumPy arrays, which is what makes the physics and solver code testable and composable on its own, independent of what an image file actually looked like.

| Module | Responsibility |
|---|---|
| `utils.io` | Image loading, natural-sort file discovery, hue extraction, JSON/NPY helpers |
| `core.calibration` | Builds the hue-vs-displacement `UnivariateSpline` from a stepped-filter image sequence |
| `core.processing` | Hue &rarr; displacement (`hue_to_displacement`), and flow-minus-background delta-displacement |
| `core.filters` | Optional Gaussian, median, bilateral, or total-variation smoothing - all NaN-mask preserving |
| `core.stats` | Ensemble mean/std, turbulence intensity, Reynolds decomposition, spatial profiles and correlation on time stacks |
| `core.physics.optics` | Displacement &rarr; deflection angle &rarr; refractive-index gradient |
| `core.physics.fields` | High-level density/temperature/pressure reconstruction, wrapping the solvers |
| `core.physics.gas` | Gladstone-Dale constant and specific gas constant lookups |
| `core.solvers.integration` | 1-D cumulative trapezoidal integration with NaN-gap interpolation |
| `core.solvers.poisson` | Sparse direct or iterative (CG/BiCGSTAB) 2-D Poisson reconstruction |
| `core.solvers.abel` | Inverse Abel transform wrapper (PyAbel) for axisymmetric fields |
| `utils.export` | VTK ImageData (`.vti`/`.pvd`), HDF5, CSV, NumPy export |

## From hue to density: the physics

A ray's transverse displacement $\delta$ at the filter plane gives a deflection angle $\varepsilon = \delta / f_2$, where $f_2$ is the focal length of the decollimating optics. That deflection is related to the refractive-index gradient along the ray's path by

$$\frac{\partial n}{\partial x} = \frac{\varepsilon \, n_0}{L}$$

with $n_0$ the ambient refractive index and $L$ the optical path length through the test section. The Gladstone-Dale relation then ties refractive index to density through a gas-specific constant $K$:

$$\frac{\partial n}{\partial x} = K\,\frac{\partial \rho}{\partial x}$$

Chaining these collapses the whole optics step into a single setup constant, $C = n_0 / (f_2 L K)$, so that `density_grad = displacement_field * C` is, quite literally, the entire optical inversion once $C$ is known - the rest of the library exists to get a trustworthy `displacement_field` into that line, and to integrate the resulting gradient back into a density.

Three solvers are available for that last integration step, and which one applies depends on the flow's dimensionality:

| Method | Function | Best for |
|---|---|---|
| 1-D cumulative integration | `density_from_gradient_1d` | Weakly 2-D or single-view flows - fast, but accumulates integration error along the path |
| 2-D Poisson (sparse or iterative) | `density_from_gradient_2d` | Genuinely planar flows with both $x$- and $y$-displacement fields available |
| Inverse Abel transform | `density_from_gradient_abel` | Axisymmetric flows (jets, plumes, flames) via PyAbel's `hansenlaw`, `basex`, or `three_point` methods |

Once density is known, temperature follows from whichever thermodynamic assumption fits the flow - isobaric ($T = T_\text{ref}\,\rho_\text{ref}/\rho$), isentropic, Boussinesq, or the ideal-gas law directly - and `pyrsd.core.physics.gas` carries the Gladstone-Dale and specific-gas constants needed to get there for air, nitrogen, CO&#8322;, hydrogen, and helium out of the box.

## Validating the pipeline: natural convection off a heated plate

Before pointing the pipeline at the actual (and much harder to validate) compressible wall jet, it had to prove itself on a flow with a known answer: natural convection rising off a PID-controlled, Peltier-heated vertical flat plate, at two wall temperatures, imaged with the same rig and the same filter.

<img src="../assets/media/work_assets_pyrsd/pyrsd-natural-convection-validation.png" alt="Natural convection RSD validation at 40C and 60C: hue-extracted image, mean density gradient, ensemble mean density, and ensemble mean temperature fields for each temperature">
<span class="md-caption">Full pipeline output for both wall temperatures tested. Left to right: the raw hue-extracted image, the mean density-gradient magnitude |&part;&rho;/&part;x| from `process_stack` + `ensemble_mean`, the reconstructed ensemble-mean density field, and the derived ensemble-mean temperature field. x is wall-normal, y runs vertically along the plate.</span>

The hue-extracted images already show the boundary layer as a thin band of shifted color hugging the plate; the mean-gradient panels sharpen that into a clean ridge of $|\partial\rho/\partial x|$ tracking the layer's edge, growing (0.016 to 0.025 kg m&#8315;&#179; mm&#8315;&sup1;, peak-to-peak) with the higher wall temperature, exactly as boundary-layer theory predicts. Integrating that gradient field and converting to temperature under the isobaric assumption gave a wall temperature, extrapolated from the reconstructed field back to $x=0$, of about 312 K against a 313 K set point at the lower condition (&asymp;0.3% error), and about 330 K against a 333 K set point at the higher one (&asymp;1% error) - close enough, on a flow with an independently known answer, to trust the same pipeline on data where the answer isn't known in advance.

## What was learned

Almost none of the real difficulty here turned out to be the reconstruction math - the Poisson solve and the Abel transform are both well-trodden ground. It was everything upstream: how much a slide-film graded filter's calibration drifts between sessions, how sensitive the hue-to-displacement mapping is to ambient lighting and camera white balance, and how much of an apparently real signal in a first pass turned out to be noise once the calibration curve was refit properly. Enforcing the "all I/O in one module" rule early also paid for itself directly - it made it possible to unit-test the calibration, optics, and solver code against synthetic gradient fields with known analytical answers, entirely without touching a camera.

## What's still open

Abel inversion for genuinely axisymmetric flows remains the roughest edge in the library - a candle plume was the original axisymmetric test case, and reconstructions from it still show artifacts near the centerline that a cleaner `symmetry_axis` handling would probably fix. More fundamentally, `pyrsd` treats every stack as a set of independent snapshots reduced to ensemble statistics; it has no notion of tracked motion between frames, so there's no path yet from it to Schlieren Imaging Velocimetry, which is the natural next step the underlying thesis work points toward. On the reconstruction side, the 2-D Poisson solver currently needs both $x$- and $y$-displacement fields from a single camera view, which most single-view RSD setups (including this one) don't actually have simultaneously - a genuinely single-view 2-D capability would mean either a second camera axis or falling back to a forward-model/regularized-inverse formulation instead of solving the Poisson equation directly.

---

Built on the color-schlieren formulation established by Ajay K. Agrawal's group (see Agrawal, Alammar & Gollahalli, *Exp. Fluids* 32, 2002; Wong & Agrawal, *SPIE* 5580, 2005) and grounded in Gary S. Settles' *Schlieren and Shadowgraph Techniques* (Springer, 2001) for the classical optics `pyrsd` extends into a quantitative, per-pixel measurement.
