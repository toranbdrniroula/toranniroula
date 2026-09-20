---
title: "OpenFOAM CFD for a Fixed-Wing UAV, and the Effect of Blended Winglets"
date: "2025"
---

This was a Research Migration Project for the FOSSEE Fellowship at IIT Bombay: take a published ANSYS Fluent study of a small fixed-wing UAV and reproduce it entirely in OpenFOAM, then push past replication into a design question the original paper never asked. The reference is S.M.A. Meftah et al., "Numerical Simulation of a Flow Around an Unmanned Aerial Vehicle" (*Mechanika*, 2011) - a small UAV with an inverted V-tail and twin boom, analysed at 20 m/s with the Spalart-Allmaras turbulence model, validated against experimental data for an isolated wing. Meftah et al. never looked at winglets. Once the baseline was replicated and validated, I added blended winglets at 45° and 90° cant angles to the same wing and asked whether and how much they help.

**Key parameters**

`solver`: simpleFoam (OpenFOAM v2406)
`turbulence`: Spalart-Allmaras
`mesh`: snappyHexMesh, medium grid (2.60M cells) selected after a 3-level GCI study
`freestream`: 20 m/s, Re ≈ 0.315 × 10⁶ (chord = 0.236 m)

### Interactive geometry

All three airframes actually flown through the solver - drag to rotate, scroll to zoom.

<stl-reader href="https://cdn.jsdelivr.net/gh/toranbdrniroula/Aerodynamics-of-Fixed-Wing-UAV@75716a79f7f26e2d4c405ca55fc55dd5a5473e26/geometry/baseline.stl" bg-color="#ffffff:#000000" surface-color="#4fa3d1" height="380"></stl-reader>
<span class="md-caption">Baseline half-geometry - inverted V-tail, twin boom, Clark YH wing / NACA 0012 tail. Exported directly from the CATIA build used for meshing.</span>

<stl-reader href="https://cdn.jsdelivr.net/gh/toranbdrniroula/Aerodynamics-of-Fixed-Wing-UAV@75716a79f7f26e2d4c405ca55fc55dd5a5473e26/geometry/cant45.stl" bg-color="#ffffff:#000000" surface-color="#e8935a" height="380"></stl-reader>
<span class="md-caption">45° cant angle winglet - the better-performing of the two configurations tested.</span>

<stl-reader href="https://cdn.jsdelivr.net/gh/toranbdrniroula/Aerodynamics-of-Fixed-Wing-UAV@75716a79f7f26e2d4c405ca55fc55dd5a5473e26/geometry/cant90.stl" bg-color="#ffffff:#000000" surface-color="#8a6fd1" height="380"></stl-reader>
<span class="md-caption">90° cant angle winglet - same tip chord (0.1 m), same 0.2 m blend length, same 0.05 m wing extension as the 45° case.</span>

[Download the full internship report (PDF)](../assets/downloads/fossee-uav-cfd-internship-report.pdf) &middot; [Full case setup, ready to run](https://cfd.fossee.in/research-migration-project/full-download/project/62)

## Governing equations

Steady, incompressible RANS, closed with the one-equation Spalart-Allmaras model:

$$\nabla \cdot \mathbf{u} = 0, \qquad \rho(\mathbf{u}\cdot\nabla)\mathbf{u} = -\nabla p + \nabla\cdot\left[(\mu+\mu_t)\left(\nabla\mathbf{u}+(\nabla\mathbf{u})^T\right)\right]$$

with the turbulent eddy viscosity $\mu_t = \rho\nu_t$ carried by a transport equation for a modified turbulent viscosity $\tilde{\nu}$:

$$\mathbf{u}\cdot\nabla\tilde{\nu} = c_{b1}\tilde{S}\tilde{\nu} - c_{w1}f_w\left(\frac{\tilde{\nu}}{d}\right)^2 + \frac{1}{\sigma}\left[\nabla\cdot\left((\nu+\tilde{\nu})\nabla\tilde{\nu}\right) + c_{b2}(\nabla\tilde{\nu})^2\right]$$

SA was chosen over the (generally more accurate for separated flow) K-Omega SST specifically because it's more forgiving of mesh quality at the cell counts this project could afford, and because it's what the reference study used, so matching the closure model was part of making the validation meaningful.

## Geometry, domain, and mesh

The longitudinal half-geometry (steady flight, no sideslip, so the symmetry plane is justified) was built in CATIA V5R21 from Meftah et al.'s published dimensions and figures. Several dimensions weren't given in the original paper, so fuselage length and cross-section, tail chord, wing-to-tail distance, boom diameter and were estimated from proportions in the published schematics. What is fixed: 2900 mm projected wingspan, 1955 mm total length, 236 mm wing chord, 1080 mm projected tail span, 4° dihedral, 4° wing incidence, Clark YH airfoil on the wing, NACA 0012 on the tail. The exported STL was cleaned in MeshLab before meshing.

<div class="md-figure-row">
  <img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-domain-setup.png" alt="Simulation domain setup showing inlet, outlet, side, and symmetry boundaries">
  <img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-dimensioned-drawing.png" alt="Dimensioned three-view drawing of the UAV geometry">
</div>
<span class="md-caption">Domain (30 m × 15 m × 7.5 m half-width, roughly 15-20 chord-equivalent lengths downstream) and the dimensioned geometry reconstructed from Meftah et al.'s figures.</span>

`blockMesh` generated the background block with edge grading toward the airframe; `snappyHexMesh` cut the unstructured surface mesh from the STL, with dedicated surface refinement on the airframe, a coarser refinement box over the wake, and prism layers for the boundary layer.

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-surface-mesh.png" alt="Surface mesh detail on the UAV with the wake refinement box visible">
<span class="md-caption">Surface refinement on the airframe and the wake refinement box that captures the tail and near-wake region.</span>

**Solver setup**

| Variable | Solver | Under-relaxation | Convergence tolerance |
|---|---|---|---|
| p | GAMG, Gauss-Seidel smoother | 0.3 | 1×10⁻⁵ |
| U | smoothSolver, Gauss-Seidel | 0.7 | 1×10⁻⁶ |
| k | smoothSolver, Gauss-Seidel | 0.5 | 1×10⁻⁶ |
| omega | smoothSolver, Gauss-Seidel | 0.5 | 1×10⁻⁶ |
| nuTilda | smoothSolver, Gauss-Seidel | 0.7 | 1×10⁻⁶ |

Gradient: Gauss linear (cell-limited for U, nuTilda). Divergence: linear-upwind for velocity, bounded limited-linear for turbulence quantities. Laplacian: Gauss linear corrected. Inlet velocity was set as $(20\cos\alpha, 20\sin\alpha, 0)$ per angle of attack, with a freestream condition on the side patch and symmetryPlane on the symmetry face.

## Turbulence model check and grid convergence

Before committing to Spalart-Allmaras for the full sweep, I cross-checked it against K-Omega SST. Both agree well through the linear lift range; SA predicts a visibly more gradual stall, consistent with the two-equation model resolving turbulent length scales more precisely than the one-equation model does.

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-turbulence-model-comparison.png" alt="C_L and C_D vs angle of attack comparing K-Omega SST and Spalart-Allmaras, with percentage difference bar chart">
<span class="md-caption">K-Omega SST vs Spalart-Allmaras: lift and drag polars, the C_L-C_D curve, and the percentage difference between the two models across the angle-of-attack sweep.</span>

Grid independence was checked at α = 4° across three mesh densities with a refinement ratio of 2.5, using Richardson extrapolation and the Grid Convergence Index:

<plotly-chart href="../content/data/fossee-uav-grid-convergence.json" type="scatter" title="C_L vs Mesh Count - Grid Convergence Study" height="360"></plotly-chart>
<span class="md-caption">C_L is non-monotonic across the three grids (0.5154 $$\rightarrow$$ 0.5186 $$\rightarrow$$ 0.5106) but stays within 0.8% of the Richardson-extrapolated value throughout. GCI was 0.67% coarse-to-medium and 0.27% medium-to-fine, both comfortably under the 1% threshold - the medium grid (2.60M cells) was carried forward for every subsequent run.</span>

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-mesh-density-comparison.png" alt="Cross-sectional comparison of coarse, medium, and fine mesh density around the UAV">
<span class="md-caption">Cross-sections of the coarse (1.04M), medium (2.60M), and fine (6.50M) grids used for the convergence study.</span>

## Baseline validation against Meftah et al.

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-validation-against-meftah.png" alt="Lift and drag coefficient comparison between the current OpenFOAM study and Meftah et al., with absolute error and percentage error plots">
<span class="md-caption">C_L and C_D vs angle of attack against Meftah et al.'s Fluent results, with absolute and percentage error. Stall onset at 13° is captured by both.</span>

Agreement is good through the linear range and worsens somewhat past stall, which is exactly where the geometry assumptions (fuselage cross-section, V-tail placement) matter most: deviations stay under 9.4% in C_L and 18.9% in C_D up to 13°, widening to 13.2% in C_L and 21.6% in C_D at 17°. Residuals for continuity and momentum drop at least five orders of magnitude within 1000 iterations at every angle of attack tested.

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-baseline-residual-convergence.png" alt="Residual convergence plots for pressure and velocity at three angles of attack for the baseline UAV">
<span class="md-caption">Residual convergence for p, Ux, Uy, Uz at α = 0°, 5°, 13° - stable convergence at every angle in the sweep, including near stall.</span>

## Winglet cant angle study

With the baseline validated, the wingtip was extended 0.05 m and blended into a 0.2 m winglet at either 45° or 90° cant, unswept at the leading edge with a 0.1 m tip chord and matched taper ratio to the main wing. Projected area grows slightly with each configuration - 0.3422 m² baseline, 0.3732 m² at 90°, 0.3889 m² at 45° - which is itself a small confound: some of the lift gain below is from added area, not purely from the winglet's vortex control.

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-winglet-geometry.png" alt="Winglet geometry showing 45 degree and 90 degree cant angles relative to the wing plane">
<span class="md-caption">Both winglet cant angles, referenced to the same wing-extension geometry.</span>

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-winglet-performance.png" alt="Aerodynamic performance comparison of baseline, 45 degree, and 90 degree winglet configurations">
<span class="md-caption">C_L, C_D, the C_L-C_D polar, and L/D vs angle of attack for all three configurations. Both winglets sit above the baseline on lift and below it on drag past the very lowest angles of attack.</span>

<plotly-chart href="../content/data/fossee-uav-winglet-ld-improvement.json" type="bar" title="Max L/D Improvement Over Baseline" height="340"></plotly-chart>
<span class="md-caption">Maximum L/D improvement over the baseline, each at its own best angle of attack: 10.9% at 90° cant (α = 5°), 14.95% at 45° cant. The 45° winglet also holds a lower C_D than the 90° configuration at every angle tested, despite the larger projected area.</span>

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-winglet-residual-convergence.png" alt="Residual convergence for the winglet configurations">
<span class="md-caption">Residual convergence for both winglet cases - same solver settings and tolerances as the baseline.</span>

## Flow visualization and spanwise flow

Wingtip vortices form from spanwise flow leaking from the high-pressure lower surface to the low-pressure upper surface around the tip - the mechanism behind induced drag. A winglet acts as a physical barrier to that leakage.

<hero-carousel interval="2500" label="Spanwise velocity at the trailing edge, baseline vs 45 degree vs 90 degree winglet" fit="contain">
  <img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-baseline-spanwise-flow.png" alt="Spanwise flow at the trailing edge for the baseline UAV across angles of attack" data-caption="Baseline - no winglet. Strong spanwise velocity gradient concentrated right at the tip.">
  <img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-winglet45-spanwise-flow.png" alt="Spanwise flow at the trailing edge for the 45 degree winglet across angles of attack" data-caption="45° cant winglet - visibly the most effective suppression of spanwise leakage.">
  <img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-winglet90-spanwise-flow.png" alt="Spanwise flow at the trailing edge for the 90 degree winglet across angles of attack" data-caption="90° cant winglet - reduced relative to baseline, but less than the 45° case.">
</hero-carousel>
<span class="md-caption">Each strip sweeps α = 0°, 3°, 5°, 10°, 13°. The 45° winglet's more effective spanwise-flow suppression is the direct mechanism behind its better L/D improvement above.</span>

The wingtip vortices themselves were isolated with the Q-criterion (Q = 2000), which separates genuine rotation from shear strain:

<img src="../assets/media/work_assets_fossee_uav_cfd/fossee-uav-qcriterion-isosurface-q2000.png" alt="Q-criterion isosurfaces comparing the baseline UAV and the UAV with 45 degree winglet at 5 degrees angle of attack">
<span class="md-caption">Q = 2000 isosurfaces, baseline vs 45° winglet at α = 5°, colored by velocity magnitude. The wake vortices trailing off the fuselage are essentially unchanged; the wingtip vortex is visibly and specifically reduced by the winglet.</span>

## What was learned

Both winglet configurations improve lift-to-drag ratio over the baseline across the sweep, and the flow visualization confirms the actual mechanism rather than just the aggregate coefficients: the winglet suppresses spanwise flow leakage at the tip, shrinks the wingtip vortex, and that reduction in induced drag outweighs the small parasitic drag penalty from the wing extension needed to blend it in. The 45° cant angle beats the 90° configuration on every metric that matters - lower drag at matched lift, a larger maximum L/D gain (14.95% vs 10.9%), and visibly tighter vortex suppression in the Q-criterion comparison - which lines up with it having the more effective spanwise-flow barrier. Cant angle, not just the presence of a winglet, is doing real aerodynamic work here.

## What's still open

The geometry reconstruction is the main source of uncertainty in the baseline validation: Meftah et al.'s paper doesn't give exact fuselage cross-section, tail chord, or wing-tail spacing, so those were estimated from figure proportions, and that shows up as the growing C_L/C_D error past stall, where fuselage-wing junction and tail placement matter most. The mesh also averages y+ ≈ 18, coarser than ideal for fully resolving the boundary layer, and everything here is steady-state - real gust response and time-resolved vortex shedding are outside what `simpleFoam` can say anything about. The study also deliberately stayed focused on aerodynamic performance rather than the vortex structures themselves, so there's no dedicated vortex-dynamics study here despite the Q-criterion visualization. Natural next steps: transient runs with time-varying angle of attack, elevator/control-surface deflection (completely absent here), general turning flight rather than just cruise, and a proper winglet-shape optimization, surrogate-modeled or CFD-in-the-loop now that cant angle is confirmed to matter.

---

This was completed under the FOSSEE Fellowship's OpenFOAM Research Migration Project at IIT Bombay. My thanks to Asst. Prof. Chandan Bose (University of Birmingham), Asst. Prof. Tushar Chourushi, and CFD Engineer Nikhil Bhamare for supervision, FOSSEE mentor Manjil Sitoula for mentoring, and Project Manager Payel Mukherjee and entire IIT Bombay FOSSEE team for the support and for providing access to workstation that made this study possible.
