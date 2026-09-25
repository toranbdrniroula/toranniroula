---
title: "Surface Heating Effects on a Compressible Wall Jet, Imaged with Rainbow Schlieren"
date: "2025-2026"
---

A jet running tangentially along a surface is one of the standard building blocks of applied aerodynamics - film cooling, wing circulation control, de-icing, thrust vectoring all lean on the same shear-and-mixing physics. Heat the surface the jet is running along and the picture gets more coupled: the thermal boundary layer and the momentum boundary layer now fight for the same near-wall real estate, and at high-subsonic Mach numbers even a moderate temperature difference produces a measurable change in density. That density change is exactly what an optical diagnostic can see, and almost nobody has actually gone and quantitatively imaged it for a *compressible* wall jet over a *heated* plate - most of the wall-jet literature is incompressible, and most of the schlieren-of-heated-surfaces literature is a static boundary layer with no jet running over it. That gap, and the fact that closing it needed a diagnostic technique with essentially no local literature or vendor support, is what this thesis spent a year on.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-candle-plume.png" alt="Rainbow Schlieren Deflectometry image of a candle plume, hue-coded density gradient field">
<span class="md-caption">This is what the technique actually records - a candle plume here, not the wall jet - a continuous hue field standing in for a continuous density-gradient field. Green is the undisturbed background; every shift toward red or blue is a ray that got deflected by a real gradient in the flow. Everything below is this same idea, calibrated and pointed at a heated compressible jet instead of a candle.</span>

I want to be upfront about scope, the same way I try to be on every project here: this was a four-person final year thesis at the Department of Mechanical and Aerospace Engineering, IOE Pulchowk Campus, with Amogh Adhikari, Anup Bajgain, Yogesh Dhami and me as co-authors, under Asst. Prof. Kamal Darlami and Asst. Prof. Laxman Motra. The facility build, the CFD, and the experimental campaign were genuinely joint work across all four of us. Together, we used the available resources to setup the schlieren and to build quantitative schlieren instrumentation from scratch including filter design, and procurement, heating setup and overall experimental setup, validation setup and the Rainbow Schlieren Deflectometry pipeline end to end, the filter calibration and image processing, and `pyrsd`, the Python library to make that pipeline reproducible (its own write-up, on the software side specifically, is [here](case-file.html?slug=pyrsd-library&category=research)) - while still giving the facility and the CFD the space they need to make sense as a whole project.

[Download the full thesis report (PDF)](../assets/downloads/wall-jet-rsd-thesis-report.pdf)

**Key parameters**

`technique`: Rainbow Schlieren Deflectometry, Z-type twin-mirror, f = 1500 mm, 200 mm aperture
`facility`: 3D-printed converging nozzle (12 mm x 5 mm exit) + PID/Peltier-heated flat plate (40, 60 degC)
`conditions`: NPR ~ 1.5 / 1.8, M_exit ~ 0.79 / 0.97, p_inf = 0.871 bar (Kathmandu, ~1400 m)
`CFD`: realizable k-epsilon (plumbing), k-omega SST (2D wall jet, ANSYS Fluent)
`processing`: `pyrsd` v0.0.1 (custom Python library) - calibration, ensemble statistics, 1D/2D density reconstruction

## Building a jet facility around an altitude nobody designs for

Compressed air comes from a 2 HP, 70-liter reservoir compressor, through a Bourdon-gauge regulator, about a meter of 8 mm hose, a 90-degree elbow, and into the 3D-printed converging nozzle. The gauge only reads pressure at the regulator outlet - it says nothing about what actually survives the trip to the nozzle inlet, and it turned out a lot didn't. CFD of the full supply path (Section below) put the loss at roughly 30%, which nobody had budgeted for until the CFD forced the issue.

The other number nobody budgets for by default is Kathmandu's altitude. At about 1400 m, ambient pressure here is 0.871 bar, well under the sea-level value every standard nozzle-design reference quietly assumes. A converging nozzle chokes once the pressure ratio across it clears $(\frac{\gamma+1}{2})^{\gamma/(\gamma-1)} = 1.893$ - at sea-level ambient that number is a comfortable margin away from anything a shop compressor produces; at Kathmandu ambient it isn't. Combining the choking condition with the measured 30% supply-line loss gives the operating table we actually designed the test matrix around:

| p_gauge (bar) | p0 at nozzle (bar abs) | NPR | M_exit | V_exit (m/s) |
|---|---|---|---|---|
| 1.0 | 1.31 | 1.51 | ~0.75-0.79 | ~256-260 |
| 1.4 | 1.60 | 1.83 | ~0.95-0.97 | ~305-324 |

Past 2.0 bar gauge the nozzle chokes outright - schlieren images show two sharp lines converging toward the jet centerline from the nozzle-lip corners, the signature of oblique compression waves off an under-expanded supersonic exit, intensifying steadily from 2 through 4 bar. No such structures appear at 1.0 or 1.4 bar, which is why quantitative RSD was run only at those two settings: everything at or above choking is a different flow regime that the rest of this facility (and this thesis) wasn't built to characterize.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-nozzle.jpg" alt="3D-printed converging nozzle, 12mm by 5mm exit, contraction ratio 9.25">
<span class="md-caption">The 3D-printed converging nozzle: 1-inch pipe inlet down to a 12 mm x 5 mm exit, contraction ratio 9.25, height profile a 5th-order polynomial for zero slope and curvature at both ends.</span>

The plate the jet runs along is a high-conductivity metal sheet, 205 mm x 150 mm x 5 mm, heated from underneath by Peltier (TEC1-12706) modules bonded on with thermal paste, their cold sides isolated against plywood so cold-side cooling doesn't leak into the flow. An Arduino Nano running a PID loop drives four IRFZ44N MOSFETs switching the Peltiers, closing the loop on embedded NTC thermistors reading the plate surface. Infrared thermography would have been the obvious way to check surface-temperature uniformity, but the polished metal plate has such low emissivity that the IR camera mostly imaged reflected ambient radiation instead of the plate itself - one of a handful of "obvious" instrumentation choices that didn't survive contact with the actual hardware.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-peltier-assembly.jpg" alt="Peltier module and thermistor assembly bonded to the underside of the metal plate">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-pid-schematic.png" alt="Schematic of the PID heating control system">
</div>
<span class="md-caption">Peltier/thermistor assembly on the plate underside (left), and the PID control schematic driving four TEC1-12706 modules through an Arduino Nano and MOSFET power stage (right).</span>

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-pid-response-60c.png" alt="PID temperature response reaching 60 degrees C setpoint over time">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-pwm-response.png" alt="PWM duty cycle response of the PID controller versus plate temperature">
</div>
<span class="md-caption">Closed-loop response at the 60 degC setpoint (left), and the PWM duty cycle the controller settles to once the plate stabilizes (right).</span>

Everything sits vertically, jet pointing up, plate hanging beside it, which looks like an odd choice until you account for the schlieren rig: the Z-type system's optical path and the lab's available floor space made a horizontal layout physically impossible without one mirror blocking the other's line of sight. Every result in this thesis is re-oriented back to the conventional horizontal "jet flowing left to right" presentation before it's plotted; only the physical rig itself runs vertical.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-experimental-setup.jpg" alt="Annotated photo of the full experimental facility showing the compressor, PID system, nozzle, and heated flat plate">
<span class="md-caption">The full facility: compressor and PID box at left, the nozzle-and-plate assembly running vertically at center, schlieren mirrors and the high-speed camera off to the right.</span>

## A Z-type schlieren rig, and why the filter is the whole story

Standard schlieren gives you a single greyscale intensity per pixel - the first derivative of refractive index with an arbitrary sign convention baked in by wherever the knife edge happens to sit, and no reliable way back to a physical gradient magnitude. We tried a single-mirror layout first and dropped it almost immediately: off-axis geometry produced visible double images. The double-mirror Z-type arrangement fixes that by keeping every optical component on a shared axis, at the cost of needing two 1500 mm-focal-length, 200 mm-aperture parabolic mirrors and a lab long enough to fit the resulting Z.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-schlieren-system.jpg" alt="Complete Z-type double-mirror schlieren system with rectangular source aperture and color filter">
<span class="md-caption">The complete Z-type, twin-mirror schlieren rig - light source and rectangular aperture at one end, color filter and camera at the focal plane of the second mirror.</span>

Rainbow Schlieren Deflectometry replaces the knife edge with a continuously graded color filter sitting at that second mirror's focal plane, so a ray's deflection shows up as a hue shift instead of a brightness change - and, calibrated properly, that hue shift is directly invertible back to a physical displacement. A point or circular source can't support this: it only ever gives you a magnitude, with no way to isolate direction. A rectangular slit source fixes that, at the cost of having to fabricate one - ours was 3D-printed with a sharp-edged blade for the cutting edge, spatially calibrated to about 0.15 mm wide.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-aperture-slit.jpg" alt="Close-up of the fabricated rectangular slit source aperture">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-aperture-full.jpg" alt="Rectangular source aperture mounted in the schlieren light path">
</div>
<span class="md-caption">The 3D-printed rectangular slit aperture (left) and its mounting in the light path (right) - roughly 0.15 mm wide, sharp-bladed edge.</span>

### The filter itself was the hardest part to get right

An RSD filter has three design knobs, and getting all three wrong once each is basically what this section is about. **Hue range**: HSV hue wraps at 360 degrees back to red, which makes a calibration spline non-invertible if the working range crosses that wrap point - we used 0-300 degrees (red through magenta), which also rules out symmetric filters for asymmetric flows like this one, since you can't tell a positive deflection from a negative one once the hue's ambiguous. **Filter width**: sensitivity (hue change per unit deflection) scales inversely with filter width, and the maximum measurable deflection is $\epsilon_{max} = w/(2f_2)$ - narrower filters read finer gradients but saturate sooner near the wall where gradients are largest. We fabricated a full step series from 1.5 mm to 5 mm and empirically found 2.5-3.0 mm the right compromise for this flow: narrow enough to resolve the near-wall gradient, wide enough not to saturate there. **Fabrication medium**: this is the one that actually cost the most time. Digitally printed filters on transparency film looked fine to the eye and were completely inadequate under the camera - visible halftone dot structure at the scale of the focal spot, and poor transmissivity on top of it. Slide-film filters, printed on E6 reversal film through a professional photo lab (digitalslides.co.uk, since nothing local does this), have a grain size two-plus orders of magnitude finer than the focal spot and produced clean, monotonic calibration curves with no visible banding.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-filter-digital-print.png" alt="Schlieren image showing halftone noise from a digitally printed transparency filter">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-filter-e6-film.png" alt="Clean schlieren image from an E6 slide-film filter with no halftone artifacts">
</div>
<span class="md-caption">Digitally printed transparency filter (left) versus E6 slide-film filter (right) - same flow, same camera. The halftone dot structure on the left is exactly the kind of artifact you don't notice until you've calibrated against it.</span>

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-filter-slides.jpg" alt="Three E6 slide-film filter slides with linear gradient, bullseye, and calibration-strip filters of varying width and saturation">
<span class="md-caption">The three filter slides actually produced: continuous linear gradients at widths from 5.0 mm down to 1.5 mm (Slide 1), bullseye and grey-overlaid variants for weak-gradient work (Slide 2), and discrete calibration strips (Slide 3). All three printed on E6 film through digitalslides.co.uk.</span>

Calibration itself is mechanically simple and easy to get subtly wrong: the filter sits on a micrometer translation stage, gets displaced in known steps with no flow present, and `pyrsd.build_calibration_data` records the circular-mean hue in a central ROI at each step (circular-mean because hue is an angle, and a plain arithmetic mean breaks near any wrap point). A smoothing spline fit to the valid 0-300 degree range gives an invertible hue-to-displacement lookup.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-calibration-curve.jpg" alt="RSD calibration curve: hue value versus known filter displacement">
<span class="md-caption">Hue-vs-displacement calibration curve for a 2.5 mm filter - the invertible lookup that turns a raw hue field into a physical displacement field.</span>

## From hue to density gradient

Everything from here down is one chained relationship. A collimated ray traveling through a spanwise refractive-index gradient over path length $L$ deflects by

$$\varepsilon = \frac{K_{GD} L}{n_0}\frac{\partial \rho}{\partial y}$$

via the Gladstone-Dale relation ($n - 1 = K_{GD}\rho$, $K_{GD} = 2.23\times10^{-4}\ \mathrm{m^3\,kg^{-1}}$ for air), and arrives at the filter displaced by $\Delta d = f_2 \varepsilon$. Chaining those two and inverting for the gradient,

$$\frac{\partial \rho}{\partial y}(x,y) = \underbrace{\frac{n_0}{K_{GD}\,L\,f_2}}_{C}\ \Delta d(x,y)$$

which, for this rig's specific geometry ($L = 150$ mm spanwise test-section depth, $f_2 = 1500$ mm), collapses every fixed optical parameter into a single setup constant $C = 19.93\ \mathrm{kg\,m^{-3}\,mm^{-2}}$. Once $\Delta d(x,y)$ is known from the calibration curve, `density_grad = displacement_field * C` really is the entire optical inversion - everything else in the pipeline exists to get a trustworthy $\Delta d$ field into that one line. (The software side of this - the actual module layout, the NaN-aware solver, the Poisson-vs-1D-integration tradeoff - is covered in more depth in the [pyrsd write-up](case-file.html?slug=pyrsd-library&category=research); this article stays at the physics and results level.)

Density, once the gradient is known, comes from either cumulative 1D integration along the wall-normal direction (fast, but integration error accumulates monotonically down each column) or a 2D Poisson solve using both gradient components at once (globally more accurate, but needs both components and a well-conditioned right-hand side). Every ensemble mean below used at minimum a few hundred frames, checked for statistical convergence with a rolling coefficient of variation on the per-frame mean absolute displacement - frames only enter the average once that RCoV drops and stays below 5% for 50 consecutive frames, which discards the transient jet-establishment spike (RCoV ~0.17-0.18) that shows up in the first 50-100 frames of every acquisition.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-ensemble-convergence.png" alt="Rolling coefficient of variation of the mean displacement for all four wall jet test conditions, showing a transient spike followed by stabilization below the 5 percent threshold">
<span class="md-caption">Rolling coefficient of variation (50-frame window) for all four wall-jet conditions - a sharp startup transient, then a stable plateau well under the 5% threshold used to define the averaging window.</span>

## Validating the pipeline before trusting it on the jet

Before pointing any of this at the actual wall jet, the whole chain - calibration, hue extraction, reconstruction, temperature conversion - needed a check against a flow with a known answer. Natural convection off the same heated vertical plate, same two setpoints, no jet running, is about as clean a validation case as you can ask for: an isobaric ideal-gas assumption converts reconstructed density straight to temperature, and the plate's thermistor-measured setpoint is the ground truth to check against.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-hue-nc-40c.png" alt="Hue-extracted RSD image of the natural convection boundary layer at 40 degrees C">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-hue-nc-60c.png" alt="Hue-extracted RSD image of the natural convection boundary layer at 60 degrees C, showing a visibly thicker blue band">
</div>
<span class="md-caption">Raw hue-extracted natural convection boundary layer, T_w = 40 degC (left) vs 60 degC (right). The blue band is the boundary layer against a green (zero-deflection) ambient - visibly broader at the higher wall temperature, exactly as expected.</span>

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-density-gradient-nc-40c.png" alt="Mean density gradient magnitude field for natural convection at 40 degrees C">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-density-gradient-nc-60c.png" alt="Mean density gradient magnitude field for natural convection at 60 degrees C, showing higher peak gradient">
</div>
<span class="md-caption">Mean density-gradient magnitude, ~500-frame ensemble: peak ~0.016 kg m^-3 mm^-1 at 40 degC, rising to ~0.026 kg m^-3 mm^-1 at 60 degC - the gradient magnitude scaling with the larger imposed wall-to-ambient density difference, as it should.</span>

Reconstructing density and temperature from that gradient (1D integration, anchored at the known ambient density $\rho_\infty = p_\infty/(R T_\infty) = 1.050\ \mathrm{kg\,m^{-3}}$ at Kathmandu conditions) gives a narrow, elevated-temperature layer hugging the plate in both cases:

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-rho-t-mean-nc-40c.png" alt="Reconstructed mean density and temperature fields for natural convection at 40 degrees C">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-rho-t-mean-nc-60c.png" alt="Reconstructed mean density and temperature fields for natural convection at 60 degrees C">
</div>
<span class="md-caption">Reconstructed density and temperature fields, T_w = 40 degC (left) and 60 degC (right) - near-wall density depleted to ~0.99 and ~0.94 kg/m^3 respectively, temperature elevated to a peak of ~312 K and ~330 K.</span>

The number that actually matters is the wall temperature recovered by extrapolating the reconstructed profile back to the plate surface: **312 K against a 313 K setpoint (~0.3% error) at 40 degC**, and **330 K against a 333 K setpoint (~1% error) at 60 degC**. Both within experimental uncertainty of the thermocouple ground truth - which is the checkpoint that made the rest of this thesis possible. Wall-normal profiles at three heights along the plate collapse onto essentially one curve outside the boundary layer and separate cleanly inside it, with the profiles closer to the leading edge showing marginally sharper gradients, consistent with a laminar boundary layer that's thinnest where the flow has had the least distance to develop.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-rho-t-profiles-nc-40c.png" alt="Wall-normal density and temperature profiles at three heights for natural convection at 40 degrees C">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-rho-t-profiles-nc-60c.png" alt="Wall-normal density and temperature profiles at three heights for natural convection at 60 degrees C">
</div>
<span class="md-caption">Wall-normal density/temperature profiles at y = 3, 11, 18 mm from the plate top, 40 degC (left) and 60 degC (right) - near-collapse outside the boundary layer, clean separation inside it.</span>

## Putting the jet over the heated plate

With the pipeline trusted, the same rig went on the actual wall jet, at the four-condition test matrix the pressure-loss analysis above defined: 1.0 and 1.4 bar gauge, crossed with 40 and 60 degC plate temperature, each run with a 2.5 mm filter (0-300 degree range) and the rectangular slit source. Every displacement field shows the same qualitative shape shift relative to natural convection: the high-displacement band is thinner, more intense right at the nozzle exit, and extends much further downstream before decaying - forced convection compresses the thermal layer into a narrower wall-normal extent while sustaining it over a longer streamwise development length than pure buoyancy ever could.

<hero-carousel interval="2200" label="Mean displacement fields across all four wall-jet test conditions" fit="contain">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-displacement-1.0bar-40c.png" alt="Mean displacement field, 1.0 bar gauge, 40 degrees C wall temperature" data-caption="1.0 bar, 40 degC - the thinnest, weakest displacement band of the four.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-displacement-1.0bar-60c.png" alt="Mean displacement field, 1.0 bar gauge, 60 degrees C wall temperature" data-caption="1.0 bar, 60 degC - noticeably stronger and broader than the 40 degC case at the same pressure.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-displacement-1.4bar-40c.png" alt="Mean displacement field, 1.4 bar gauge, 40 degrees C wall temperature" data-caption="1.4 bar, 40 degC - the higher jet momentum compresses the band vertically relative to the 1.0 bar case.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-displacement-1.4bar-60c.png" alt="Mean displacement field, 1.4 bar gauge, 60 degrees C wall temperature" data-caption="1.4 bar, 60 degC - highest pressure and temperature together, the most compact, intense band of the four.">
</hero-carousel>

Converting displacement to density gradient via the setup constant sharpens the same story into a well-defined high-gradient band sitting right at the plate surface - substantially thinner and more intense than the natural-convection boundary layer at the same wall temperature (which peaked near 0.028 kg m^-3 mm^-1 over several millimeters' width; the forced-convection band here is a fraction of that width).

<hero-carousel interval="2200" label="Mean density gradient fields across all four wall-jet test conditions" fit="contain">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-gradient-1.0bar-40c.png" alt="Mean density gradient field, 1.0 bar gauge, 40 degrees C" data-caption="1.0 bar, 40 degC - thin, low-magnitude near-wall band, decaying streamwise as the shear layer grows.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-gradient-1.0bar-60c.png" alt="Mean density gradient field, 1.0 bar gauge, 60 degrees C" data-caption="1.0 bar, 60 degC - visibly stronger contrast against the 1.4 bar case at this temperature than at 40 degC.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-gradient-1.4bar-40c.png" alt="Mean density gradient field, 1.4 bar gauge, 40 degrees C" data-caption="1.4 bar, 40 degC - noticeably narrower and more intense band than the 1.0 bar case at the same temperature.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-gradient-1.4bar-60c.png" alt="Mean density gradient field, 1.4 bar gauge, 60 degrees C" data-caption="1.4 bar, 60 degC - the largest pressure-driven contrast of any condition pair.">
</hero-carousel>

Normalized wall-normal profiles at four streamwise stations ($x/H \approx$ 4.5, 10.5, 18.0, 25.5, with $H = 5$ mm the nozzle exit height) show the peak gradient migrating away from the wall and broadening with downstream distance in every condition - the thermal boundary layer simply growing, as it should - with a consistent two-region structure: a sharp near-wall peak from the thermal boundary layer, and a flatter outer region merging into the free shear layer. The transition between the two sharpens noticeably at 1.4 bar, where the thermal layer is pinned tighter to the wall by the stronger jet momentum.

<hero-carousel interval="2200" label="Normalized wall-normal density gradient profiles at four streamwise stations, all four conditions" fit="contain">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-profiles-1.0bar-40c.png" alt="Normalized density gradient profiles at four streamwise stations, 1.0 bar gauge, 40 degrees C" data-caption="1.0 bar, 40 degC - broad, gradual profiles, least-pronounced peak of the four conditions.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-profiles-1.4bar-40c.png" alt="Normalized density gradient profiles at four streamwise stations, 1.4 bar gauge, 40 degrees C" data-caption="1.4 bar, 40 degC - a sharper, more concentrated near-wall peak than the 1.0 bar case.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-profiles-1.0bar-60c.png" alt="Normalized density gradient profiles at four streamwise stations, 1.0 bar gauge, 60 degrees C" data-caption="1.0 bar, 60 degC - the most distinct two-region structure of the four conditions.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-profiles-1.4bar-60c.png" alt="Normalized density gradient profiles at four streamwise stations, 1.4 bar gauge, 60 degrees C" data-caption="1.4 bar, 60 degC - highest momentum and temperature together, sharpest near-wall confinement.">
</hero-carousel>

### Temperature and pressure don't act independently

This is the part of the results I find most interesting, because the two knobs interact rather than just adding up. At **1.0 bar**, wall temperature has a large, clean effect: the 60 degC profiles sit well above the 40 degC ones at both x = 30 mm and x = 100 mm, and the gap actually *grows* with downstream distance as the thermal boundary layer keeps developing.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-temperature-effect-1.0bar.png" alt="Comparison of wall normal density gradient profiles at 40 and 60 degrees C wall temperature, 1.0 bar gauge, at two streamwise stations">
<span class="md-caption">Effect of wall temperature at 1.0 bar gauge, x = 30 and 100 mm - a clean, growing separation between the 40 and 60 degC cases.</span>

At **1.4 bar**, that same temperature effect is largely suppressed near the nozzle - the 40 and 60 degC profiles are nearly on top of each other at x = 30 mm - and only re-emerges further downstream. The higher jet momentum is convecting heat away from the near-wall region fast enough to mostly cancel out the extra 20 degC of wall superheat, at least until the jet has had more distance to develop.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-temperature-effect-1.4bar.png" alt="Comparison of wall normal density gradient profiles at 40 and 60 degrees C wall temperature, 1.4 bar gauge, at two streamwise stations">
<span class="md-caption">Effect of wall temperature at 1.4 bar gauge - the same comparison as above, but the separation is suppressed in the near field and only appears at x = 100 mm.</span>

The reservoir-pressure comparison tells the same coupling from the other side: at 40 degC the two pressures track closely with only a modest divergence downstream, but at 60 degC the pressure effect becomes large, particularly by x = 100 mm, where the lower-momentum 1.0 bar case actually shows a *stronger* near-wall gradient than the 1.4 bar case - the higher wall superheat sustains a thicker thermal layer against weaker convective removal. Part of this is genuinely thermal, and part of it is compressibility: the ~0.2 Mach-number difference between the two pressure settings means the jet exit density itself differs even with no heating at all, so some of the pressure-driven contrast is baked in before the wall temperature ever enters the picture.

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-pressure-effect-40c.png" alt="Comparison of wall normal density gradient profiles at 1.0 and 1.4 bar gauge pressure, 40 degrees C wall temperature, at two streamwise stations">
<span class="md-caption">Effect of reservoir pressure at 40 degC - close agreement near the nozzle, modest divergence downstream.</span>

<img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-pressure-effect-60c.png" alt="Comparison of wall normal density gradient profiles at 1.0 and 1.4 bar gauge pressure, 60 degrees C wall temperature, at two streamwise stations">
<span class="md-caption">Effect of reservoir pressure at 60 degC - a much larger effect, and the 1.0 bar case actually exceeds 1.4 bar by x = 100 mm, evidence of buoyancy-momentum coupling that only shows up at the higher wall superheat.</span>

The streamwise decay of the peak gradient pulls the same story into one view per temperature: both raising wall temperature and raising reservoir pressure elevate the peak gradient level, and the shape of the decay curve itself stays broadly similar across conditions - the underlying jet-development physics isn't fundamentally different between cases, just scaled.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-streamwise-decay-40c.png" alt="Streamwise decay of peak density gradient at 40 degrees C wall temperature, both pressures">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-streamwise-decay-60c.png" alt="Streamwise decay of peak density gradient at 60 degrees C wall temperature, both pressures">
</div>
<span class="md-caption">Streamwise decay of the peak mean density gradient, 40 degC (left) and 60 degC (right), both operating pressures. The pressure-driven separation is clear at 40 degC and largely closes up at 60 degC, where wall temperature dominates.</span>

## Checking against CFD - and why it doesn't match perfectly

Two separate CFD studies support the experiment. A "plumbing" simulation of the full supply path (realizable k-epsilon, standard wall functions) exists purely to translate a regulator gauge reading into an actual nozzle-inlet total pressure and Mach number - it's the source of the 30% loss factor and the operating table above. The wall-jet simulation itself is 2D steady RANS with k-omega SST, chosen over k-epsilon for its better near-wall behavior at $y^+ \approx 1$ without wall functions, run in ANSYS Fluent as a compressible ideal-gas flow at the Kathmandu operating pressure.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-mesh-plumbing.png" alt="Mesh of the plumbing assembly used for the supply line CFD simulation">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-mesh-2d-domain.png" alt="Mesh of the 2D wall jet domain with near-wall refinement">
</div>
<span class="md-caption">Plumbing mesh, used solely to characterize supply-line losses (left), and the 2D wall-jet domain mesh with near-wall refinement to y+ ~ 1 (right).</span>

Both meshes went through an actual independence study rather than a single "looks converged" run - element size against nozzle exit velocity for the plumbing, element count against wall heat transfer coefficient for the wall jet, since HTC is the quantity most sensitive to near-wall resolution.

<plotly-chart href="../content/data/wall-jet-rsd-mesh-independence-plumbing.json" type="scatter" title="Plumbing Mesh Independence - Nozzle Exit Velocity" height="340"></plotly-chart>
<span class="md-caption">Plumbing mesh independence: nozzle exit velocity changes by under 0.02% between the two finest meshes (517k and 1.46M elements) - a 2 mm element size was carried forward for all subsequent runs.</span>

<plotly-chart href="../content/data/wall-jet-rsd-mesh-independence-walljet.json" type="scatter" title="Wall Jet Mesh Independence - Heat Transfer Coefficient" height="340"></plotly-chart>
<span class="md-caption">Wall-jet mesh independence: wall HTC changes by under 0.35% between the 140,400 and 278,052 element meshes; the 140,400-element mesh was used for every subsequent simulation.</span>

Comparing the 2D RANS density-gradient profiles against the RSD-derived profiles at four streamwise stations (1.0 bar, 60 degC) shows the same qualitative shape - a near-wall gradient peak decaying and migrating outward with x - but a real quantitative gap: CFD's peak gradient runs roughly an order of magnitude higher than the experiment near the nozzle exit (x = 20 mm), closing somewhat downstream but never fully.

<hero-carousel interval="2800" label="CFD versus RSD density-gradient profile comparison at four streamwise stations" fit="contain">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-cfd-vs-rsd-x20mm.png" alt="Comparison of CFD and RSD wall normal density gradient profiles at x = 20mm" data-caption="x = 20 mm - the largest CFD/RSD discrepancy, right where turbulent structures are most energetic.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-cfd-vs-rsd-x45mm.png" alt="Comparison of CFD and RSD wall normal density gradient profiles at x = 45mm" data-caption="x = 45 mm - the gap narrows but is still clearly present.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-cfd-vs-rsd-x80mm.png" alt="Comparison of CFD and RSD wall normal density gradient profiles at x = 80mm" data-caption="x = 80 mm - profile shapes converge more closely here.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-cfd-vs-rsd-x120mm.png" alt="Comparison of CFD and RSD wall normal density gradient profiles at x = 120mm" data-caption="x = 120 mm - closest agreement of the four stations, though a real gap remains.">
</hero-carousel>

Several things stack up to produce that gap, and I think it's worth naming all of them rather than picking one culprit: k-omega SST, for all its near-wall strengths, is still a Boussinesq eddy-viscosity closure that can't represent the anisotropic turbulent heat flux a heated compressible shear layer actually has, and tends to over-sharpen near-wall gradients as a result. The 2D assumption compresses a genuinely 3D flow (the rectangular nozzle has real spanwise edge effects) into one plane. And RSD itself integrates along the full 150 mm spanwise depth of the test section - it's a line-of-sight average by construction, which smooths exactly the kind of sharp near-wall structure CFD resolves pointwise. Some of the "discrepancy" is therefore two techniques measuring two genuinely different things, not one of them being simply wrong.

## Qualitative demonstrations: what color buys you over grey

Before any of the quantitative work above, the rig needed simpler flows to prove the optics were aligned and sensitive at all - and those simpler flows double as a clean illustration of what a continuous hue field buys you over a knife-edge cutoff, since a knife edge only ever gives brightness, with no way to read gradient magnitude or direction from a single frame.

Matched sequences of a matchstick ignition, one run with the knife edge, one with the color filter, make the comparison direct: the knife-edge frame shows a recognizable bright/dark plume structure, but the actual gradient strength anywhere in it has to be inferred from brightness alone. The RSD frame encodes the same instant as a continuous hue field where direction and relative magnitude are both directly legible - no post-processing needed to tell that the flame's core is a stronger, oppositely-signed gradient than its edges.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-matchstick-knife-edge.png" alt="Knife-edge schlieren image of a matchstick ignition, showing bright and dark structure but no quantitative gradient information">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-matchstick-rsd.png" alt="Rainbow schlieren image of the same matchstick ignition, showing continuous hue encoding of gradient direction and magnitude">
</div>
<span class="md-caption">Same event, two techniques: knife-edge schlieren (left) versus RSD with a linear color filter (right) - the color image is directly readable in a way the greyscale one isn't.</span>

A candle flame descending into a rising butane plume (butane is roughly twice the molecular weight of air, so it produces a real compositional density interface on top of the thermal one) is a good stress test of that legibility over time: the flame envelope shows up as a warm hue on its inner face and cool on its outer face, directly reflecting the gradient's sign flip across the combustion zone, and the whole progression from a quiet compositional interface to a fully turbulent flame reads directly off the raw hue sequence.

<hero-carousel interval="1200" label="RSD image sequence of a candle flame descending into a rising butane plume" fit="contain">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-butane-flame-t0.png" alt="RSD frame of candle flame and butane plume at t0" data-caption="t0 - candle flame in the upper field, faint compositional plume below.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-butane-flame-t2.png" alt="RSD frame of candle flame and butane plume at t0 plus 50ms" data-caption="t0 + 50 ms - the flame envelope's warm/cool hue split becomes visible as it descends.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-butane-flame-t4.png" alt="RSD frame of candle flame and butane plume at t0 plus 100ms" data-caption="t0 + 100 ms - flame reaching further into the plume.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-butane-flame-t6.png" alt="RSD frame of candle flame and butane plume at t0 plus 150ms" data-caption="t0 + 150 ms - turbulent transition setting in.">
  <img src="../assets/media/work_assets_wall_jet_rsd/wall-jet-rsd-butane-flame-t8.png" alt="RSD frame of candle flame and butane plume at t0 plus 200ms" data-caption="t0 + 200 ms - a coherent warm-to-cool structure dominates the field.">
</hero-carousel>

## What was learned

The facility works, and it's characterized well enough to trust: the 30% supply-line loss and the Kathmandu-altitude choking limit are both quantified rather than assumed, and the nozzle's behavior across the full pressure range (subsonic through choked-and-underexpanded) is confirmed directly in schlieren imagery rather than inferred from a spec sheet. `pyrsd` turns a color image sequence into a calibrated, reproducible density field, and the natural-convection validation - wall temperature recovered to within 0.3-1% of the thermocouple setpoint - is the result I trust most in the whole thesis, because it's the one point where the answer was known before the measurement.

On the physics itself: wall heating and jet momentum don't act independently on the near-wall density-gradient structure. Wall temperature dominates at low jet momentum, jet momentum dominates - and actively suppresses the temperature effect - at high momentum, and the two only become comparable, with genuinely interesting buoyancy-momentum coupling, at the highest wall superheat tested. That interaction, not just "heating the wall increases the gradient" on its own, is the actual finding. CFD agrees with the RSD measurements on shape but not magnitude, and the sources of that gap (turbulence-model limitations, the 2D idealization, and RSD's own line-of-sight averaging) are distinguishable enough from each other that I don't think there's one obvious fix - it would need all three addressed at once to close.

## Limitations and things that didn't work

- **Line-of-sight integration** is the fundamental ceiling on any planar RSD or schlieren measurement: the field is a spanwise average over the full 150 mm test-section depth, and genuine 3D structure near the nozzle's side edges is invisible to it by construction.
- **Direct velocity measurement never happened.** The available Pitot probe tops out around 100 m/s and the hot-wire around 35 m/s, both well under the CFD-estimated 250-310 m/s exit velocities - Mach number here is a CFD estimate, not a direct measurement, and that's a real limitation on the operating-condition table above.
- **IR thermography failed** for the reason mentioned earlier: the polished plate's low emissivity meant the IR camera was imaging reflected ambient radiation, not the plate.
- **The RSD filter fabrication path** took real iteration to get right - digitally printed transparency filters looked plausible until they were actually calibrated, and the E6-slide-film route needed an overseas photo lab, since nothing local does that kind of fine-grain color printing.
- **Z-type schlieren alignment is genuinely fussy** - the minimum achievable angle between the two mirror legs constrained the usable test-section width, and re-aligning after almost anything moved in the lab was routine, not exceptional.
- **An Abel inversion attempt on the candle plume failed** outright, from plume asymmetry and turbulent transition - it's not used anywhere in the final analysis, and stayed out deliberately rather than being forced to work.

## What's still open

A pressure-rated Pitot tube or laser Doppler anemometry would directly validate the CFD-estimated exit Mach numbers instead of leaving them as an assumption. A temporary graphite or black-paint coating on a plate section (without permanently altering the experiment) would let IR thermography actually validate spatial temperature uniformity. Higher optical magnification ($\Delta x \lesssim 0.05$ mm/px, versus the ~0.278 mm/px used here) would resolve the near-wall gradient finely enough to extract a genuine Nusselt-number correlation for the heated wall jet - not attempted in this thesis - and schlieren imaging velocimetry, cross-correlating pairs of high-speed frames the way PIV does with seeded particles, would extract actual velocity fields directly from the density-gradient structures already being recorded. Dynamic Mode Decomposition on the same RSD sequences would complement the (not yet performed, but planned) POD analysis with frequency-indexed rather than purely energy-ranked modes, and a 3D LES of the wall jet would resolve the turbulent structures that 2D RANS necessarily throws away - which is also, not coincidentally, most of what's still open on the `pyrsd` side, where SIV, DMD, and a cleaner axisymmetric Abel-inversion path are the natural next modules.

---

Co-authored with Amogh Adhikari, Anup Bajgain, and Yogesh Dhami as our final year thesis in the Department of Mechanical and Aerospace Engineering, IOE Pulchowk Campus, Tribhuvan University. My thanks to Asst. Prof. Kamal Darlami and Asst. Prof. Laxman Motra for supervising the project and for the expertise on schlieren imaging and flow visualization that made the RSD side of this possible at all, to Asst. Prof. Dr. Sudip Bhattarai for feedback on the experimental setup, to Asst. Prof. Biman Rimal for help procuring instruments, to Salim Maharjan for generously sharing his knowledge, and to the Flow Visualization Laboratory and the Department of Mechanical and Aerospace Engineering, Pulchowk Campus, for the workspace, tools, and the room to spend a year building something that didn't exist here before.
