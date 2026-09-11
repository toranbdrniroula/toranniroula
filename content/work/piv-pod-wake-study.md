---
title: "PIV/POD Analysis of a NACA0015 Airfoil in Reverse Flow"
date: "2025"
---

## How it was done

In high-speed rotorcraft forward flight, part of the retreating rotor blade sees reverse flow: the geometric trailing edge becomes the effective aerodynamic leading edge, and the blade separates early, generating drag and negative lift instead of the usual attached-flow behavior. The Experimental Aerodynamics Group at IIT Kanpur's Flow Control Laboratory had already acquired PIV data for a baseline NACA0015 airfoil in this configuration (12° angle of attack, 20 m/s freestream, Re = 1.35 × 10⁵, 500 image pairs at 4 Hz) as part of a larger study on serrated trailing edges for reverse-flow control. My internship was entirely on the post-processing side: the wind-tunnel run, PIV acquisition, and experimental setup were already done before I arrived.

Raw image pairs were processed in PIVlab (MATLAB): masking, CLAHE contrast enhancement, a four-pass FFT window-deformation scheme (two passes at 64 px, two at 32 px), and spatial calibration, exported as instantaneous velocity fields. From there, everything moved to Python: mean velocity, vorticity, Q-criterion, Reynolds stresses, and turbulence intensity were computed from the 500-snapshot ensemble. Proper Orthogonal Decomposition was then applied to the unsteady velocity component, via an economy SVD (`X = UΣVᵀ`) on the flattened, stacked snapshot matrix, to pull out the dominant coherent structures and reconstruct the flow field from a reduced set of modes.

**Key parameters**

`technique`: PIV (PIVlab) + Python post-processing
`conditions`: NACA0015, α = 12°, U∞ = 20 m/s, Re = 1.35 × 10⁵
`decomposition`: POD via economy SVD, 500 snapshots

## What was learned

The mean flow field showed complete separation at the sharp (aerodynamic) leading edge with no reattachment over the chord, and a massive recirculation bubble dominating the near-wake. Q-masked vorticity confirmed coherent vortical structures shed from both the separated shear layer and the trailing-edge region, and turbulence intensity peaked right at the boundary between forward and reverse flow, consistent with the strong shear there. POD energy decayed slowly (the first 7 modes captured about 50% of the fluctuation energy, 160 modes for 90%), which is itself informative: it's the signature of a fully separated, strongly recirculating flow rather than a clean, low-dimensional oscillator. The first two spatial modes showed a clear phase-shifted pair, pointing to an oscillatory shedding behavior in the separated shear layer.

## What's still open

Dynamic Mode Decomposition was studied at a theoretical level but deliberately not applied: the PIV data's 4 Hz sampling rate can't resolve the unsteady phenomena reported in the reverse-flow literature, which occur up to roughly 1 kHz. Getting DMD-quality temporal resolution on this configuration would need a redesigned acquisition, not just different post-processing, and was outside this internship's three-and-a-half-week scope.
