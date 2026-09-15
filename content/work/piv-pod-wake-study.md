---
title: "PIV/POD Analysis of a NACA0015 Airfoil in Reverse Flow"
date: "2025"
---

Part of a rotor blade sees reverse flow on every rotation, in every forward-flying helicopter. On the retreating side of the disk, the blade's rotational speed and the aircraft's forward speed partly cancel, and past a certain radius the local flow direction actually reverses. The geometric trailing edge, sharp and never meant to see oncoming air, suddenly becomes the effective aerodynamic leading edge. It separates immediately, the section produces negative lift and enormous drag, and the resulting impulsive loads are a genuine structural concern at high-speed forward flight. This is one of the standing problems in rotorcraft aerodynamics, and it's the reason the Experimental Aerodynamics Group (EAG) at IIT Kanpur's Flow Control Laboratory has an ongoing wind-tunnel program studying passive control of it, specifically, whether a serrated ("sinusoidal") trailing edge can tame the separation better than a plain one. The animation above is all 500 instantaneous PIV snapshots played back as normalized vorticity - the same recirculating wake that every mean-field plot below flattens into a single time-averaged picture.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-motivation-serrated-te.jpg" alt="PIV flowfield and tuft visualization over a NACA0015 airfoil, baseline versus sinusoidal trailing edge">
<span class="md-caption">Baseline versus sinusoid-trough trailing edge, from EAG's broader study: tuft visualization and mean-flow PIV. This is the motivating research program my internship's dataset came from - the serrated-edge comparison itself was not part of my work.</span>

I spent three and a half weeks in that lab, under Asst. Prof. Dr. Tufan K. Guha, working on a narrower and more specific piece of that program: post-processing an already-acquired PIV dataset for the *baseline* NACA0015 case in reverse flow, extracting the flow physics from it, and applying Proper Orthogonal Decomposition to pull out the dominant coherent structures. I want to be upfront about scope, since it matters for how to read everything below: the wind-tunnel run, the PIV acquisition, and the experimental setup were all done before I arrived, by Ranga Srinivas Gokul and the EAG team. My internship started at the `.mat` files PIVlab produces and went from there.

<span style="cursor: pointer;" onmouseover="this.style.color='#0000EE';" onmouseout="this.style.color='';">
[Download the full internship report (PDF)] (../assets/downloads/iitk-reverse-flow-piv-pod-internship-report.pdf)
</span>

## The dataset

The configuration was about as clean a baseline as reverse-flow studies get: a symmetric NACA0015 airfoil at 12° angle of attack, 20 m/s freestream, 0.1 m chord, giving Re = 1.35 × 10⁵. Image pairs were captured at a 17 μs pulse separation, 500 pairs total, at a 4 Hz sampling rate. That last number turns out to matter a lot later.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-piv-setup-photo.jpg" alt="PIV measurement plane at the NACA0015 airfoil leading edge">
<span class="md-caption">The PIV measurement plane at what is, in this reverse-flow configuration, the aerodynamic leading edge (the airfoil's geometric trailing edge).</span>

## From raw image pairs to velocity fields

Raw pairs went through PIVlab, a MATLAB-based, free and open-source PIV tool: masking out the region without seeding, CLAHE contrast enhancement, then a four-pass FFT window-deformation scheme (two passes at 64 px, two at 32 px) to get the cross-correlation right at multiple scales. Spatial calibration converted pixel displacement to physical units, giving a 1 px/frame → 3.34 m/s conversion factor once combined with the 17 μs time step. The output was instantaneous 2D velocity fields, exported to `.mat` and handed off to Python - the rest of the pipeline (NumPy, SciPy, Matplotlib) is where the actual analysis happened.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-piv-pod-workflow.png" alt="PIVlab and Python post-processing and POD workflow diagram" style="max-width:100%;display:block;margin:0 auto;">
<span class="md-caption">The full post-processing pipeline: PIVlab for image-pair processing, then Python for field analysis and POD.</span>

Inside PIVlab itself, that's three concrete stages on every image pair: mask out the airfoil (nothing valid is ever going to correlate inside solid metal), cross-correlate to get a raw vector field, then validate and interpolate over any spurious vectors before the field is trusted enough to export.

<hero-carousel interval="2000" label="PIVlab processing stages on a single image pair" fit="contain">
  <img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-pivlab-mask.jpg" alt="PIVlab airfoil mask over the raw PIV image" data-caption="Step 1 - masking the airfoil out of the raw image before correlation.">
  <img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-pivlab-vector-overlay.jpg" alt="Raw PIVlab velocity magnitude overlay on the seeded image" data-caption="Step 2 - the raw cross-correlated velocity magnitude, overlaid on the seeded image.">
  <img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-pivlab-vector-validation.jpg" alt="PIVlab vector field validation, valid vectors in green" data-caption="Step 3 - vector validation: green is an accepted vector, red the masked-out region.">
</hero-carousel>

Each `u` and `v` matrix came in with shape `(500, 154, 206)` - 500 snapshots over a 154×206 spatial grid. Mean flow quantities were straightforward from there:

$$U_{mean}(x,y) = \frac{1}{N}\sum_{t=1}^{N} u(x,y,t), \qquad V_{mean}(x,y) = \frac{1}{N}\sum_{t=1}^{N} v(x,y,t)$$

with vorticity computed from the velocity gradients of the mean field,

$$\omega_z = \frac{\partial V_{mean}}{\partial x} - \frac{\partial U_{mean}}{\partial y}$$

and normalized by chord and freestream velocity so it's comparable across configurations. Vorticity alone isn't a reliable vortex indicator, though - it doesn't distinguish rotation from pure shear strain. For that I used the Q-criterion, decomposing the velocity gradient tensor into its symmetric (strain) and antisymmetric (rotation) parts and defining

$$Q = \tfrac{1}{2}\left(\lVert\Omega\rVert^2 - \lVert S\rVert^2\right)$$

with $Q > 0$ marking regions where rotation genuinely dominates strain - a masked, physically meaningful way to isolate coherent vortices rather than just shear layers.

## What the mean field looks like

The mean velocity field made the separation unambiguous: flow separates right at the sharp leading edge and never reattaches over the chord, with a large recirculation bubble sitting in the wake. The white dashed contour in the figure below marks $\bar{u}=0$, the boundary between forward and reverse streamwise flow.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-mean-velocity.jpg" alt="Mean velocity magnitude contour with streamlines, 20 m/s, 12 degrees AOA">
<span class="md-caption">Mean velocity magnitude, U∞ = 20 m/s, α = 12°. The dashed contour marks zero mean streamwise velocity - the interface between the recirculating and forward-moving flow.</span>

Q-masked vorticity confirms this is a genuinely rotational wake and not just a diffuse shear region: counter-clockwise rotation sheds from the lower-surface separation point, clockwise rotation from the upper-surface trailing-edge flow, and the two interact and shed into the wake.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-vorticity-qmask.jpg" alt="Mean normalized vorticity contour without and with high-Q mask">
<span class="md-caption">Mean normalized vorticity, unmasked (left) and masked by high Q values (right) - isolating the coherent vortical structures from the surrounding shear.</span>

Turbulence intensity peaks right along that separation boundary, which is exactly where you'd expect it: it's where the backward-moving recirculation and the forward freestream are shearing directly against each other. The freestream itself, by contrast, is close to laminar-quiet.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-turbulence-intensity.jpg" alt="Turbulence intensity contour of the reverse flow wake">
<span class="md-caption">Turbulence intensity, computed from the RMS velocity fluctuations. Highest values sit just outboard of the mean separation line.</span>

Streamwise normal stress $\overline{u'u'}$ and Reynolds shear stress $\overline{u'v'}$ tell a consistent story: both concentrate along the wake/freestream interface, with the shear stress in particular showing strong, oppositely-signed momentum exchange above and below the recirculation - evidence of real turbulent transport across that boundary, not just noise.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-streamwise-normal-stress.jpg" alt="Streamwise normal stress u'u' contour">
  <img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-reynolds-shear-stress.jpg" alt="Reynolds shear stress u'v' contour">
</div>
<span class="md-caption">Streamwise normal stress (left) and Reynolds shear stress (right). Both concentrate along the boundary between the recirculating wake and the freestream.</span>

## Pulling structure out of the noise: POD

Mean fields and single-point statistics tell you *that* the flow is unsteady and separated, but not what the dominant unsteady motions actually look like. For that I used Proper Orthogonal Decomposition on the fluctuating velocity component, $u' = u - U_{\text{mean}}$, $v' = v - V_{\text{mean}}$.

The mechanics are just an economy SVD on a snapshot matrix. Each snapshot's $u'$ and $v'$ fields get flattened and stacked into a single column, one column per time step, giving a $63{,}448 \times 500$ matrix $\mathbf{X}$ (with any $\text{NaN}$s or infinities from the masked region zeroed out first, for numerical stability). Decomposing,

$$\mathbf{X} = \mathbf{U}\mathbf{\Sigma}\mathbf{V}^T$$

$\mathbf{U}$'s columns are the spatial POD modes, $\mathbf{\Sigma}$'s diagonal holds the singular values (mode energies), and $\mathbf{V}^T$ carries the temporal coefficients. The energy fraction of the $k$-th mode is $E_k = \sigma_k^2 / \sum_i \sigma_i^2$, and a reduced-order reconstruction with just the first $r$ modes is $\mathbf{X}\_r = \sum\_{k=1}^{r}\sigma\_k\phi\_k v\_k^T$ - POD is optimal in exactly this sense: no other linear basis captures more energy for a given number of modes.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-svd-schematic.png" alt="Schematic of the SVD matrix decomposition used for POD" style="max-width:640px;display:block;margin:0 auto;">
<span class="md-caption">The economy SVD used to compute the POD modes and their temporal coefficients.</span>

## What the modes show

The energy spectrum decays slowly - the first 7 modes capture only about 50% of the fluctuation energy, and it takes 160 modes to reach 90%. That gradual decay is itself informative: it's the signature of a fully separated, strongly recirculating flow with energy spread across many scales, rather than a clean, low-dimensional oscillator you could describe with two or three dominant modes.

<plotly-chart href="../content/data/iitk-pod-cumulative-energy.json" type="scatter" title="POD Cumulative Energy" height="360"></plotly-chart>
<span class="md-caption">Cumulative fluctuation energy captured as a function of mode count - 50% by mode 7, 70% by mode 30, 90% by mode 160. Hover to read exact values; the slow saturation is characteristic of a fully separated wake.</span>

<plotly-chart href="../content/data/iitk-pod-mode-spectrum.json" type="scatter" title="POD Mode Energy Spectrum" height="360"></plotly-chart>
<span class="md-caption">Energy fraction of each of the first 20 individual modes. Mode 1 alone carries about 15% of the fluctuation energy; by mode 10 each additional mode contributes under 2%.</span>

The first three spatial modes are concentrated near the trailing-edge shear layer and the separated wake below the lower surface. The first two form a visibly phase-shifted pair - a spatial signature of oscillatory shedding in the separated shear layer - while the third represents smaller-scale instabilities riding on top, with correspondingly lower energy.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-pod-modes-123.jpg" alt="First three dominant POD spatial modes">
<span class="md-caption">The first three POD spatial modes. Modes 1 and 2 form a phase-shifted pair consistent with oscillatory shear-layer shedding.</span>

Reconstructing a single instantaneous snapshot with just 30 modes (70% of the energy) gives a visibly smoothed field, with a much less jagged separation line than either the full-mode reconstruction or the original data. Using all available modes recovers the original field almost exactly. The gap between those two reconstructions is the point: the fine-grained unsteadiness in a fully separated wake lives in the high-order modes, not the low-order ones - which is a very different situation from an attached-flow case where a handful of modes usually does the job.

<img src="../assets/media/work_assets_iitk_reverse_flow_piv_pod/iitk-reverse-flow-pod-reconstruction.jpg" alt="Comparison of POD reconstruction with 30 modes, all modes, and the original velocity field">
<span class="md-caption">Same instantaneous snapshot, reconstructed with 30 modes (left), all modes (center), and the original PIV field (right).</span>

## Where this stops: DMD, and the sampling-rate wall

I studied Dynamic Mode Decomposition alongside POD, since it's the natural next step: DMD gives you a specific frequency and growth/decay rate for each mode, rather than just an energy-ranked spatial pattern. I didn't apply it here, and the reason is a hard constraint rather than a choice - the PIV data was sampled at 4 Hz, while the literature on reverse-flow airfoils in this Reynolds-number range reports dominant unsteady phenomena up to roughly 1 kHz. DMD's frequency estimates are only meaningful if the sampling resolves the dynamics you're trying to extract, and by two-plus orders of magnitude, this dataset doesn't. Getting there would mean a redesigned acquisition - a high-speed camera and laser system, not different post-processing - which was well outside a three-and-a-half-week internship's scope.

## What I actually took from this

The technical output - mean fields, vorticity, Q-criterion, Reynolds stresses, a working POD pipeline - is one thing. What I think mattered more was getting direct, hands-on practice with the full chain from raw experimental images to a physically interpretable, reduced-order description of a real turbulent flow, and doing it on someone else's already-acquired data, which forces a certain discipline: you don't get to fix a bad acquisition choice after the fact, you have to understand exactly what the dataset can and can't tell you, and say so plainly. The 4 Hz ceiling on DMD is a good example - it would have been easy to run DMD anyway and rationalize the output, and the more useful thing was reporting why not to.

My thanks to Dr. Tufan K. Guha for the supervision, to Ranga Srinivas Gokul for the mentoring and the wind-tunnel background, and to the Experimental Aerodynamics Group at IIT Kanpur's Flow Control Laboratory for hosting the internship and for the dataset this work was built on.
