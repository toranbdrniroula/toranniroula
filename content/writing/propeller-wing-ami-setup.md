---
title: "Setting Up a Propeller-Wing Case in OpenFOAM: A Practical Guide to AMI"
date: 2026-07-09
excerpt: "A full walkthrough of building a physically consistent propeller-wing simulation with the Arbitrary Mesh Interface: meshing, MRF, dynamic mesh setup, boundary conditions, solver controls, and force extraction, dictionary by dictionary."
thumbnail: "../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-thumb.gif"
pdf: "assets/downloads/propeller-wing-ami-setup.pdf"
---

OpenFOAM is one of the most widely used free and open-source CFD packages, but the learning curve is steep for first-time users, and dynamic mesh cases make it steeper still: complex mesh motion handling, stricter mesh quality requirements, and interface boundaries that are easy to get subtly wrong. This is a detailed walkthrough of setting up and running a propeller-wing simulation using the Arbitrary Mesh Interface (AMI) method, where a rotating propeller operates in front of a stationary wing.

The goal here isn't to benchmark performance or validate results against experiment - that's a separate exercise. It's to be the technically sound, dictionary-by-dictionary reference I wish I'd had before starting: how to build a physically consistent dynamic case, how AMI actually handles mesh motion between rotating and stationary domains, what commonly goes wrong (poor mesh quality, AMI zero-weight issues) and how to fix it, and how to configure `dynamicMeshDict`, `snappyHexMeshDict`, and the function objects needed for force and propeller performance extraction.

This assumes you're already comfortable with OpenFOAM's file structure and dictionary syntax, and have set up at least one case before. It was built on the OpenCFD (ESI) release of OpenFOAM.

## Scope

The focus throughout is on successfully *setting up* a physically consistent case, not on benchmarking numerical performance or validating against experiment. Specifically, this covers:

- Steady-state propeller-wing simulation with the MRF approach
- Dynamic mesh handling using AMI
- Strategies for good mesh quality and refinement for this class of case
- Monitoring convergence behavior during transient runs
- Extracting aerodynamic forces, coefficients, and propeller performance data

## Geometry Preparation

The two geometries needed are an APC 12×6EP two-bladed propeller (304.8 mm diameter) and a rectangular wing with a NACA 2412 airfoil, 1450 mm half-span, and 236 mm chord. Both are common on small UAVs in the 10-30 kg take-off mass range, and APC publishes performance data for the 12×6EP, which makes CFD-vs-manufacturer-data comparison possible later.

The propeller was reconstructed in CAD from APC's station-wise geometric data (spanwise chord, twist, and sectional airfoil shape), with the airfoil coordinates pulled from sources like Airfoil Tools or the UIUC database. Blade lofting and twist application were scripted in Python inside the CAD environment, both to keep the parameterization consistent and to cut down on manual modeling error. The wing is a straightforward rectangular planform: NACA 2412 coordinates scaled to chord, imported, and extruded to span.

Once the STL files exist, check them with `surfaceCheck` before doing anything else. Unintended holes, non-manifold edges/faces, and zero-area faces are common, and tools like MeshLab or Blender handle repairs well. Any repositioning, rotation, or scaling needed to align the propeller axis with the global axis system, or to place the wing in the right aerodynamic reference frame, goes through OpenFOAM's `surfaceTransformPoints`.

<div class="md-figure-row">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-propeller-geometry.png" alt="APC 12x6EP propeller geometry">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-wing-geometry.png" alt="NACA 2412 rectangular wing geometry">
</div>
<span class="md-caption">The APC 12×6EP propeller and NACA 2412 rectangular wing geometry used in this simulation.</span>

<img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-assembly.png" alt="Wing and propeller geometry in their assembled position">
<span class="md-caption">Wing and propeller geometry in their respective positions.</span>

## Computational Domain

The domain is 12 m × 6 m × 3 m (x, y, z) - roughly 40×, 20×, and 10× the propeller diameter, or 50×, 25×, and 12.5× the wing chord, in those same directions. The origin sits at the wing leading edge on the symmetry plane. The inlet is 4 m upstream of the origin; the outlet is 8 m downstream.

The wing root lies on the symmetry plane (z = 0) with its leading edge through the origin. The propeller hub center sits 0.54 m in +z (spanwise), 0.05 m upstream of the wing leading edge, with its rotation axis parallel to the x-axis - a standard tractor-configuration layout.

Mirror symmetry is valid here because this represents a twin-propeller aircraft in straight, zero-sideslip flight: the off-center propeller position and the absence of lateral flow let a half-domain do the job at a fraction of the cost.

| Item | Position |
|---|---|
| **Domain Boundaries** | |
| Inlet plane | x = −4 m |
| Outlet plane | x = +8 m |
| Symmetry plane | z = 0 m |
| Spanwise far-field | z = +3 m |
| Top far-field | y = +3 m |
| Bottom far-field | y = −3 m |
| **Component Positions** | |
| Wing root | z = 0 |
| Wing tip | z = 1.45 m |
| Wing leading edge | (0, 0, z) m |
| Wing trailing edge | (0.236, 0, z) m |
| Propeller hub center | (−0.05, 0, 0.54) m |
| Propeller axis | Parallel to x-axis |

This leaves a large enough buffer for both the propeller-induced flow and the wing wake to develop without boundary interference.

<img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-domain.png" alt="Computational domain for the propeller-wing setup">
<span class="md-caption">The computational domain for this setup.</span>

## Base Mesh Generation

The background mesh comes from `blockMesh` - a structured hexahedral grid that `snappyHexMesh` will later refine locally around the propeller and wing STLs. It needs to be coarse enough to be cheap, but fine enough to support stable refinement and clean boundary-layer extrusion.

A single hex block discretizes the whole domain at (60 × 30 × 15) cells in x, y, z - roughly a 0.2 m background cell size, with uniform grading (`simpleGrading (1 1 1)`) since all the real refinement work happens in `snappyHexMesh`. This keeps the far field cheap without starving the propeller/wing region.

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      blockMeshDict;
}
scale   1;
vertices (
    (-4 -3 0)  // 0
    ( 8 -3 0)  // 1
    ( 8  3 0)  // 2
    (-4  3 0)  // 3
    (-4 -3 3)  // 4
    ( 8 -3 3)  // 5
    ( 8  3 3)  // 6
    (-4  3 3)  // 7
);
blocks
(
    hex (0 1 2 3 4 5 6 7) (60 30 15) simpleGrading (1 1 1)
);
boundary
(
    farField
    {
        type patch;
        faces
        (
            (4 5 6 7)
            (3 7 6 2)
            (1 5 4 0)
        );
    }
    inlet
    {
        type    patch;
        faces   ((0 4 7 3));
    }
    outlet
    {
        type    patch;
        faces   ((2 6 5 1));
    }
    symmetry
    {
        type    symmetryPlane;
        faces   ((0 3 2 1));
    }
);
```

<img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-blockmesh.png" alt="Base mesh generated by blockMesh">
<span class="md-caption">Base mesh generated by blockMesh.</span>

## snappyHexMesh

`snappyHexMesh` takes the base mesh plus the tessellated geometry and runs three stages, each toggleable independently:

1. **Castellated mesh generation** - background refinement and region-based cell removal
2. **Surface snapping** - snapping castellated vertices onto the actual geometry surfaces
3. **Layer addition** - extruding boundary-layer cells near solid walls, important for capturing near-wall viscous effects (especially in turbulent flow)

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      snappyHexMeshDict;
}
castellatedMesh true;
snap            true;
addLayers       true;
geometry
{
    propeller.stl
    { 
        type triSurfaceMesh; 
        name propeller;
    }
    wing.stl
    {
        type triSurfaceMesh;
        name wing;
    }
    ami
    { 
        type searchableCylinder; 
        point1 (-0.09 0 0.54); 
        point2 (-0.03 0 0.54); 
        radius 0.25;
    }
    box1
    {
        type box;
        min  (-1 -1 0);
        max  (8 1 2);
    }

    box2
    {
        type box;
        min  (-0.5 -0.5 0);
        max  (2.5 0.5 1.5);
    }
    box3
    {
        type box;
        min  (-0.085 -0.025 0.365);
        max  (-0.035 0.025 0.715);
    }	
    propWake
    {
        type searchableCone; 
        point1 (-0.03 0 0.54); 
        radius1 0.25;
        innerRadius1 0;
        point2 (1 0 0.54); 
        radius2 0.3;
        innerRadius1 0;
    } 
}
castellatedMeshControls
{
    maxLocalCells   8000000;
    maxGlobalCells  12000000;
    minRefinementCells  1;
    maxLoadUnbalance    0.10;
    nCellsBetweenLevels 2;
    features
    (
        { file "wing.eMesh"; level 6;}
        { file "propeller.eMesh"; level 9;} 
    );
    refinementSurfaces
    {
        propeller
        {
            level (8 9);
            patchInfo
            {
                type wall;
                inGroups (propGroup);
            }
        }
        wing
        {
            level (7 7);
            patchInfo
            {
                type wall;
                inGroups (wingGroup);
            }
        }        
        ami
        {
            level (5 5);
            faceType    baffle;
            cellZone    rotor;
            faceZone    ami;
            cellZoneInside  inside;
        }
    }
    resolveFeatureAngle 30;
    refinementRegions
    {
        ami
        {
            mode    inside;
            levels  ((1E15 5));
        }
        box1
        {
            mode    inside;
            levels ((1E15 2)); 
        }
        box2
        {
            mode    inside;
            levels  ((1E15 3)); 
        }
        box3
        {
            mode    inside;
            levels  ((1E15 6)); 
        }
        propWake
        {
            mode    inside;
            levels  ((1E15 5)); 
        }
    }
    locationInMesh (5 0 1.5);
    allowFreeStandingZoneFaces false;
}
snapControls
{
    nSmoothPatch 8;
    tolerance 1.5;
    nSolveIter 100;
    nRelaxIter 6;
    nFeatureSnapIter 10;
    implicitFeatureSnap true;
    explicitFeatureSnap false;
    multiRegionFeatureSnap true;
}
addLayersControls
{
    relativeSizes false;
    layers
    {
        "propeller" 
        {
            nSurfaceLayers 5; 
        }
        "wing" 
        {
            nSurfaceLayers 6; 
        }
        "ami"
        { 
            nSurfaceLayers 0; 
        }
        "ami_slave"
        { 
            nSurfaceLayers 0; 
        }
    }
    firstLayerThickness 5e-5;
    expansionRatio 1.2;
    minThickness 5e-7;
    nGrow 0;
    featureAngle 120;
    slipFeatureAngle 30;
    nRelaxIter 10;
    nSmoothSurfaceNormals 1;
    nSmoothNormals 10;
    nSmoothThickness 10;
    maxFaceThicknessRatio 0.7;
    maxThicknessToMedialRatio 0.3;
    minMedialAxisAngle 65;
    nBufferCellsNoExtrude 0;
    nLayerIter 100;
}

meshQualityControls
{
    maxNonOrtho 65;
    maxBoundarySkewness 4;
    maxInternalSkewness 2;
    maxConcave 80;
    minVol 1e-13;
    minTetQuality -1;
    minArea -1;
    minTwist 0.01;
    minDeterminant 1e-5;
    minFaceWeight 0.03;
    minVolRatio 0.01;
    minTriangleTwist -1;
    nSmoothScale 4;
    errorReduction 0.75;
    relaxed
    {
        maxNonOrtho 75;
    }
}
mergeTolerance 1e-6;
```

### Refinement surfaces and regions

The propeller and wing come in as triangulated STLs; the AMI cylinder, refinement boxes, and propeller wake cone are all generated procedurally by `snappyHexMesh` itself. Because the background mesh is coarse, refining only the geometry surfaces directly would create abrupt cell-size jumps - often enough to cause instability or divergence - so several nested refinement regions smooth the transition:

- **box1 / box2** - step the background cell size (200 mm) down to ~50 mm and ~25 mm respectively, both enclosing the propeller and wing
- **AMI refinement region** - refines cells inside the cylindrical AMI volume to ~6.25 mm
- **propWake region** - refines the propeller's downstream wake to 6.25 mm, for proper vortex resolution
- **box3** - nested inside the AMI volume, tight around the propeller itself, down to ~3.125 mm for blade resolution

Surface refinement (`refinementSurfaces`) then targets the actual geometry: propeller edges down to 0.39-0.78 mm, wing surface to ~1.56 mm, AMI surface to ~6.25 mm.

**AMI surface handling.** The AMI patch is defined with `faceType baffle`, which creates a two-sided internal surface and generates two patches, `ami` and `ami_slave`. These get merged into a proper Arbitrary Mesh Interface later with `createPatch`. `cellZone` defines the rotating zone, and `cellZoneInside` says whether that zone is the region inside or outside the AMI surface - also needed later for the MRF alternative.

<div class="md-figure-row">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-propeller-refinement.png" alt="Propeller surface refinement">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-wing-refinement.png" alt="Wing surface refinement">
</div>
<span class="md-caption">Propeller and wing surface refinement.</span>

<img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-refinement-regions.png" alt="Mesh section showing nested refinement regions">
<span class="md-caption">Mesh section showing refinement regions.</span>

### Layer addition

Near-wall resolution comes down to two choices: a wall-resolved mesh (y⁺ ≈ 1) or a wall-function approach (first cell in the log region). Wall-resolved is more accurate but far more expensive, since it needs a very small first-layer thickness. Here, a first-layer height of 5×10⁻⁵ m targets y⁺ ≈ 1 on both surfaces.

The usual failure modes:

- **Layer collapse** from sharp curvature changes or insufficiently small adjacent cells
- **Layer detachment** when expansion ratios are too aggressive
- **Insufficient layers added** when the underlying surface mesh is too coarse - fix with a finer base mesh or more surface refinement

If post-processed y⁺ values come out far from target, regenerate the mesh with an adjusted `firstLayerThickness` or tighter surface refinement rather than trying to patch it after the fact.

<img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-boundary-layer.png" alt="Mesh section showing added boundary layers near the wing surface">
<span class="md-caption">Mesh section showing added layers near the wing surface.</span>

## Creating AMI Patches

After `snappyHexMesh` finishes, the AMI surface exists only as a `faceZone` - it still needs converting into a proper AMI patch pair. `createPatch` does this via `system/createPatchDict`. Since the `faceZone` was named `ami` in `snappyHexMeshDict`, two patches now exist automatically: `ami` (master) and `ami_slave` (slave). Both need to become `cyclicAMI` type.

```bash
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "system";
    object      createPatchDict;
}

pointSync false;

patches
(
    {
        name            AMI1;
        patchInfo
        {
            type            cyclicAMI;
            matchTolerance  0.0001;
            neighbourPatch  AMI2;
            transform       noOrdering;
            AMIMethod       faceAreaWeightAMI;
            lowWeightCorrection 0.2;
        }
        constructFrom patches;
        patches (ami);
    }
    
    {
        name            AMI2;
        patchInfo
        {
            type            cyclicAMI;
            matchTolerance  0.0001;
            neighbourPatch  AMI1;
            transform       noOrdering;
            AMIMethod       faceAreaWeightAMI;
            lowWeightCorrection 0.2;
        }
        constructFrom patches;
        patches (ami_slave);
    }
);
```

Key parameters:

- **name** - new patch name (`AMI1`/`AMI2` replace `ami`/`ami_slave`)
- **type** - must be `cyclicAMI`
- **matchTolerance** - geometric tolerance for face-overlap detection; smaller values demand more precise overlap
- **neighbourPatch** - the paired AMI patch; each must reference the other
- **transform** - `noOrdering` for arbitrary (non-periodic) interfaces
- **AMIMethod** - `faceAreaWeightAMI` uses area-weighted averaging over face overlap
- **lowWeightCorrection** - when overlap is poor (weight sum < 1.0), this threshold enables extrapolation for stability; 0.2-0.4 is typical
- **constructFrom** / **patches** - build the new patch from an existing one
- **pointSync** - `false` prevents point-field sync across patches, which is what you want for AMI

Run it with:

```bash
createPatch -overwrite
```

`-overwrite` modifies the mesh in place. Afterward, `constant/polyMesh/boundary` should list both patches as `cyclicAMI`.

## Mesh Quality Checks

```bash
checkMesh > log.checkMesh
```

This gives the essential diagnostics - aspect ratio, skewness, non-orthogonality - the parameters that matter most for solver stability and accuracy.

**Aspect ratio** - ratio of longest to shortest cell edge. Should sit close to 1 for internal cells; boundary-layer cells can legitimately run to 100+ due to wall-normal stretching.

**Skewness** - how far a cell deviates from an ideal hexahedron shape. Close to 0 is ideal; below 4 is generally acceptable for most OpenFOAM solvers, though lower is always better.

**Non-orthogonality** - the angle between a face normal and the vector joining adjacent cell centers. A perfectly orthogonal mesh reads 0°. Below 65° is good, 70-75° is manageable with appropriate schemes (e.g. limited linear), and above 80° risks solver instability.

For a deeper check, including topology and geometry consistency:

```bash
checkMesh -allGeometry -allTopology > log.checkMesh
```

This adds face area/volume checks, concave/convex cell checks, min/max determinant, illegal faces and cells, open or non-manifold edge detection, and highly warped face detection.

Acceptable thresholds depend on the flow physics, turbulence model, numerical schemes, and solver robustness in play - high-fidelity work generally needs stricter criteria than what follows.

| Parameter | Value | Assessment |
|---|---|---|
| Max skewness | 3.99767 | Acceptable (< 4) |
| Max non-orthogonality | 65.0107° | Within limits (< 70°) |
| Average non-orthogonality | 7.02773° | Good (< 15°) |
| Max aspect ratio | 53.9146 | Acceptable (boundary layer) |
| **Mesh Quality Issues** | | |
| Concave cells | 133,588 (2.67% of total) | Expected for complex geometry |
| Cells with small determinant | 59,453 (1.19% of total) | Localized near blade edges |
| Concave faces | 1,656 | Acceptable |
| Warped faces | 77 | Minimal |

The concave cells and low-determinant cells cluster near blade leading/trailing edges, tips, and hub junctions - exactly where the geometry is most complex - but they're only 2.67% and 1.19% of the total cell count. The parameters that actually govern solver stability (max non-orthogonality, max skewness) stay well within bounds. For rotating geometry like this, some localized quality degradation is close to unavoidable, and it's fine as long as it stays localized and the rest of the mesh holds up.

## Multi-Reference Frame (MRF) Setup

MRF is the steady-state route for meshes with rotating bodies. Unlike AMI, it doesn't move the mesh at all - it keeps everything stationary and modifies the governing equations inside the rotating region to account for the rotational effects. The domain splits into a stationary zone (standard Navier-Stokes) and a rotating zone (non-inertial, modified equations), with extra source terms in the rotating zone's momentum equation for centrifugal and Coriolis effects:

$$\vec{F}_{\text{centrifugal}} = \rho \vec{\omega} \times (\vec{\omega} \times \vec{r})$$

$$\vec{F}_ {\text{Coriolis}} = -2\rho \vec{\omega} \times \vec{U}_ {\text{rel}}$$

where $\vec{\omega}$ is the angular velocity vector, $\vec{r}$ the position vector from the rotation axis, and $\vec{U}_{\text{rel}}$ the velocity relative to the rotating frame.

The rotating zone is "frozen": the mesh geometry itself never rotates, flow patterns don't evolve in time, and you only get steady-state/time-averaged performance - no blade-passage transients, no vortex shedding.

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "constant";
    object      MRFProperties;
}
MRF1
{
    cellZone    rotor;
    active      yes;
    nonRotatingPatches (AMI1 AMI2);
    origin    (-0.05 0 0.54);
    axis      (1 0 0);
    omega     733.04;  // rad/s
}
```

- **cellZone** - the rotating region defined via `topoSet` or `snappyHexMesh`
- **active** - enables/disables MRF for this zone
- **nonRotatingPatches** - patches inside the MRF zone treated as stationary (hub, shaft); critical when AMI patches are present, since they need to stay stationary to preserve interface integrity
- **origin** - a point on the rotation axis (here, the propeller hub center)
- **axis** - rotation axis direction via the right-hand rule
- **omega** - constant angular velocity in rad/s (733.04 rad/s ≈ 7000 RPM)

MRF can't capture unsteady behavior, but it's fast and gives a solid approximation of steady-state, time-averaged performance - often enough for many practical purposes. Before committing to a full unsteady rotating-mesh run, it's worth starting with a steady-state MRF case and comparing its time-averaged output against the transient result once that's available.

## Dynamic Mesh and AMI Setup

AMI lets two non-conformal mesh regions exchange information and simulate relative motion without remeshing. The two patches it connects don't share nodes, can have different cell sizes and layouts, can move relative to each other, and are topologically distinct but geometrically overlapping.

For each face on the master patch, AMI computes the overlap area with faces on the slave patch and builds weighting factors from those overlaps. Transferred quantities (velocity, pressure, etc.) at a master face are then:

$$\phi_ {\text{master},i} = \sum_ {j} w_ {ij} \cdot \phi_ {\text{slave},j}$$

where $w_ {ij}$ are weights proportional to overlap area, satisfying $\sum_ {j} w_ {ij} = 1$ - which is what guarantees flux conservation across the interface. The weights recompute automatically as the patches move relative to each other, so mass, momentum, and energy stay conserved even as the physical overlap region shifts.

### dynamicMeshDict configuration

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "constant";
    object      dynamicMeshDict;
}
dynamicFvMesh   dynamicMotionSolverFvMesh;
motionSolverLibs    (fvMotionSolvers);
motionSolver    solidBody;
cellZone    rotor;
solidBodyMotionFunction rotatingMotion;
origin  (-0.05 0 0.54);
axis    (1 0 0);
omega   table
(
    (0 0)          
    (0.05 733.04)  
    (1 733.04)    
);
predictorCorrector  true;
report  true;
```

- **dynamicFvMesh** - `dynamicMotionSolverFvMesh` means mesh motion is governed by a motion solver, not topology changes
- **motionSolverLibs** - `fvMotionSolvers` provides the standard motion solvers
- **motionSolver** - `solidBody` for rigid-body motion without deformation
- **cellZone** - the rotating region
- **solidBodyMotionFunction** - `rotatingMotion` defines rotation about an axis
- **origin** / **axis** - same as above, the propeller hub center and rotation axis
- **omega** - angular velocity schedule (rad/s); ramping 0→733.04 rad/s over the first 0.05 s avoids a numerical shock at start-up

Before running the full case, sanity-check the mesh motion on its own:

```bash
moveDynamicMesh -noFunctionObjects
```

This runs only the motion solver, no CFD, as a quick check that the mesh moves the way you expect. If AMI weights land far from 1, the AMI surfaces need more refinement, or the cylinders defining them need better alignment - getting those weights close to 1 is non-negotiable for a trustworthy result.

<div class="md-figure-row">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-patch1.png" alt="Mesh of the AMI1 patch">
  <img src="../assets/media/writing_assets_propeller_wing_ami_setup/propeller-wing-ami-patch2.png" alt="Mesh of the AMI2 patch">
</div>
<span class="md-caption">AMI1 and AMI2 patches shown together - they should look very similar.</span>

## Boundary and Initial Conditions

This is an incompressible case, so the solver resolves momentum, continuity, and turbulence transport. Turbulence closure is Spalart-Allmaras (SA) - a one-equation model well suited to external aerodynamics RANS/URANS where the flow stays mostly attached, favored here for its numerical stability and lower cost relative to two-equation models. (If separation is the actual object of study, k-ω SST is the better call, at higher cost and more sensitivity to initialization.) Four fields get initialized: velocity ($U$), kinematic pressure ($p$), turbulent viscosity ($\nu_t$), and modified turbulent viscosity ($\tilde{\nu}$).

### Velocity field (U)

`movingWallVelocity` on the propeller accounts for mesh motion; the wing gets a standard no-slip condition. The inlet is a prescribed fixed value; the outlet uses `inletOutlet` to avoid numerical instability from backflow.

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       volVectorField;
    location    "0";
    object      U;
}
#include        "include/initialConditions"
dimensions      [0 1 -1 0 0 0 0];
internalField   uniform $UInf;
boundaryField
{
    inlet
    {
        type            fixedValue;
        value           uniform $UInf;
    }
    outlet
    {
        type            inletOutlet;
        inletValue      $internalField;
        value           $internalField;
    }
    farField
    {
        type            zeroGradient;
    }
    propeller
    {
        type            movingWallVelocity;
        value           uniform (0 0 0);
    }
    wing
    {
        type            noSlip;
    }
    symmetry
    {
        type            symmetryPlane;	
    }
    AMI1
    {
        type            cyclicAMI;
        value           uniform $UInf;
    }
    AMI2
    {
        type            cyclicAMI;
        value           uniform $UInf;
    }
}
```

### Pressure field (p)

Since the solver is incompressible, `p` is kinematic pressure ($P/\rho$), dimensions m²/s².

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       volScalarField;
    location    "0";
    object      p;
}
#include        "include/initialConditions"
dimensions      [0 2 -2 0 0 0 0];
internalField   uniform $pInf;
boundaryField
{
    inlet
    {
        type            zeroGradient;
    }
    outlet
    {
        type            fixedValue;
        value           uniform $pInf;
    }
    wall
    {
        type            zeroGradient;
    }
    farField
    {
        type            zeroGradient;
    }
    symmetry
    {
        type            symmetryPlane;	
    }
    AMI1
    {
        type            cyclicAMI;
        value           uniform $pInf;
    }
    AMI2
    {
        type            cyclicAMI;
        value           uniform $pInf;
    }
}
```

A reference gauge pressure sits at the outlet; walls and far-field both get `zeroGradient`.

### Turbulence fields

SA solves for $\tilde{\nu}$ (`nuTilda`) directly; $\nu_t$ (`nut`) is algebraic but still needs initializing.

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       volScalarField;
    location    "0";
    object      nut;
}
#include        "include/initialConditions"
dimensions      [0 2 -1 0 0 0 0];
internalField   uniform $nutVal;
boundaryField
{
    inlet
    {
        type            calculated;
        value           uniform $nutVal;
    }
    outlet
    {
        type            zeroGradient;
    }
    wall
    {
        type            nutUSpaldingWallFunction;
        value           uniform 0;
    }
    farField
    {
        type            zeroGradient;
    }
    symmetry
    {
        type            symmetryPlane;	
    }
    AMI1
    {
        type            cyclicAMI;
        value           uniform $nutVal;
    }
    AMI2
    {
        type            cyclicAMI;
        value           uniform $nutVal;
    }	
}
```

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       volScalarField;
    location    "0";
    object      nuTilda;
}
#include        "include/initialConditions"
dimensions      [0 2 -1 0 0 0 0];
internalField   uniform $nuTildaVal;
boundaryField
{
    inlet
    {
        type            fixedValue;
        value           uniform $nuTildaVal;
    }
    outlet
    {
        type            zeroGradient;
    }
    wall
    {
        type            fixedValue;
        value           uniform 0;
    }
    farField
    {
        type            zeroGradient;
    }
    symmetry
    {
        type            symmetryPlane;	
    }
    AMI1
    {
        type            cyclicAMI;
        value           uniform $nuTildaVal;
    }
    AMI2
    {
        type            cyclicAMI;
        value           uniform $nuTildaVal;
    }
}
```

`nutUSpaldingWallFunction` implements Spalding's law of the wall, blending smoothly through the viscous sublayer, buffer layer, and log layer - more accurate than a standard wall function under adverse pressure gradients. It's happiest at y⁺ ≈ 30-300, though y⁺ < 1 or > 5 with a refined mesh still works, just at higher cost.

### Properties and constants

Global variables live in one `initialConditions` file, included by every boundary file - keeps parametric studies simple and avoids inconsistent boundary values scattered across files.

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "0/include";
    object      initialConditions;
}
//Ambient air variables 
UInf            (20 0 0);// m/s
pInf            0;// m^2/s^2  (p/rho)
rhoInf          1.225;// kg/m^3
muVal           1.82e-5;// kg/(m.s)
nuVal           1.5e-5;// m^2/s

//spalartAllmaras turbulence model
nuTildaVal      4.5e-5;// m^2/s nuTilda = 3*nu to 5*nu
nutVal          3.15e-6;// m^2/s nut = 0.07*nuTilda
```

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "constant";
    object      turbulenceProperties;
}
simulationType  RAS;
RAS
{
    RASModel        SpalartAllmaras;
    turbulence      on;
    printCoeffs     on;
}
```

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "constant";
    object      transportProperties;
}
transportModel  Newtonian;
nu              1.5e-05;
```

The Newtonian model assumes constant viscosity - fine for air at moderate temperature. $\nu = 1.5\times10^{-5}\ \text{m}^2/\text{s}$ corresponds to roughly 15-25°C.

## Solver Configuration and Controls

`simpleFoam` handles the steady-state run; `pimpleFoam` handles the transient one. Both are configured through `system/controlDict`, `fvSchemes`, and `fvSolution`.

### Steady-state (SIMPLE)

SIMPLE (Semi-Implicit Method for Pressure-Linked Equations) is the standard iterative procedure for incompressible steady-state flow, advancing pseudo-temporally to convergence.

```cpp
FoamFile
{
 version 2.0;
 format ascii;
 class dictionary;
 location "system";
 object controlDict;
}
application simpleFoam;
startFrom   latestTime;
startTime   0;
stopAt  endTime;
endTime 1000;
deltaT  1;
writeControl    timeStep;
writeInterval   50;
purgeWrite  0;
writeFormat ascii;
writePrecision  6;
writeCompression    no;
timeFormat  general;
timePrecision   6;
runTimeModifiable   yes;
adjustTimeStep  no;
```

- **application** - `simpleFoam` for steady-state incompressible flow
- **startFrom** - `latestTime` continues from the last saved time directory
- **deltaT** - a dummy step representing one iteration
- **endTime** - total iteration count (1000 here)
- **writeInterval** - save every 50 iterations
- **purgeWrite** - `0` keeps every saved time directory
- **runTimeModifiable** - allows editing `controlDict` live while the solver runs
- **adjustTimeStep** - fixed here, since "time step" is just an iteration count

This case typically converges within 500-1500 iterations depending on geometry complexity and mesh quality.

### Transient (PIMPLE)

PIMPLE combines PISO and SIMPLE, allowing larger time steps than pure PISO while staying stable - essential for capturing blade passage, vortex shedding, and unsteady wake interactions.

```cpp
FoamFile
{
 version 2.0;
 format ascii;
 class dictionary;
 location "system";
 object controlDict;
}
application pimpleFoam;
startFrom   latestTime;
startTime   0;
stopAt  endTime;
endTime 1;
deltaT  0.00001;
writeControl    adjustable;
writeInterval   0.002;
purgeWrite  0;
writeFormat ascii;
writePrecision  6;
writeCompression    no;
timeFormat  general;
timePrecision   6;
runTimeModifiable   yes;
adjustTimeStep  yes;
maxCo   5;
maxDeltaT   5e-5;
```

The differences from the steady-state case: `deltaT` is now a real physical time step (1e-5 s initial), `maxCo` bounds the Courant number (5 here), `writeInterval` saves every 2e-5 s, `maxDeltaT` caps the time step for temporal resolution, and `adjustTimeStep` lets the solver adapt the step to the Courant number automatically. At 7000 RPM, the propeller sweeps 1° every 2.38e-5 s - the small `deltaT` is there to actually resolve that.

### Discretization schemes

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    location    "system";
    object      fvSchemes;
}
ddtSchemes
{
    default         steadyState; // comment this line for pimpleFoam
    // default         Euler; // uncomment this line for pimpleFoam
}
gradSchemes
{
    default         Gauss linear;
    grad(p)         Gauss linear;
    grad(U)         cellLimited Gauss linear 1;
}
divSchemes
{
    default         none;
    div(phi,U)      bounded Gauss linearUpwind limited;
    div(phi,nuTilda)    bounded Gauss linearUpwind limited;
    div(phid,p)     Gauss upwind;
    div(phiMRF,p)   Gauss upwind; // remove this for pimpleFoam
    div(phiMRF,U)   Gauss upwind; // remove this for pimpleFoam
}
laplacianSchemes
{
    default         Gauss linear limited corrected 0.33;
}
interpolationSchemes
{
    default         linear;
}
snGradSchemes
{
    default         limited corrected 0.33;
}
wallDist
{
    method  meshWave;
}
```

**Time derivative** - `steadyState` zeroes the time-derivative terms for SIMPLE; `Euler` is first-order implicit and unconditionally stable but less accurate than `backward`, which is second-order but needs smaller time steps.

**Gradient** - `Gauss linear` is second-order central differencing; `cellLimited` prevents unbounded gradients where velocity gradients spike.

**Divergence** - `linearUpwind` is second-order upwind, good at capturing advection; `bounded` keeps transported quantities physical; `limited` blends toward first-order upwind where gradients get steep.

**Laplacian** - `limited corrected 0.33` adds non-orthogonal correction with limiting, essential on meshes with high non-orthogonality like this one.

### Linear solvers

```cpp
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      fvSolution;
}
solvers
{
    "pcorr.*"
    {
        solver          GAMG;
        tolerance       1e-2;
        relTol          0;
        smoother        DICGaussSeidel;
        cacheAgglomeration no;
        maxIter         50;
    }
    p
    {
        $pcorr;
        tolerance       1e-6;
        relTol          0.01;
    }
    pFinal
    {
        $p;
        tolerance       1e-6;
        relTol          0;
    }
    "(U|nuTilda)"
    {
        solver          smoothSolver;
        smoother        symGaussSeidel;
        tolerance       1e-6;
        relTol          0.1;
    }
   "(U|nuTilda)Final"
    {
        solver          smoothSolver;
        smoother        symGaussSeidel;
        tolerance       1e-6;
        relTol          0;
    }
}
cache
{
    grad(U);
}
```

**GAMG** (Geometric-Algebraic Multi-Grid) - the natural choice for pressure, using a multi-level hierarchy that scales close to linearly with mesh size; `DICGaussSeidel` smoothing is robust for symmetric positive-definite matrices.

**smoothSolver** - cheaper than GAMG for the non-elliptic momentum/turbulence equations, no coarse-grid storage overhead; `symGaussSeidel` gives good symmetric convergence.

**PIMPLE controls** (append to `fvSolution` when using `pimpleFoam`):

```cpp
PIMPLE 
{
    momentumPredictor   yes;
    nOuterCorrectors    4;
    nCorrectors 2;
    nNonOrthogonalCorrectors    2;
    residualControl
    {
        p
        {
            tolerance  1e-5;
            relTol     0;
        }
        U
        {
            tolerance  1e-5;
            relTol     0;
        }
        "nuTilda"
        {
            tolerance  1e-5;
            relTol     0;
        }
    }
}
```

- **momentumPredictor** - solves momentum before pressure correction, improving convergence
- **nOuterCorrectors** - PIMPLE loops per time step; balances accuracy against cost (4 here)
- **nCorrectors** - pressure-velocity (PISO) corrections per outer loop (2 here)
- **nNonOrthogonalCorrectors** - extra corrections for non-orthogonal meshes (2 here)

Increase `nOuterCorrectors` for larger time steps or more complex geometry; reduce it for well-resolved meshes with small time steps.

**SIMPLE controls** (append to `fvSolution` when using `simpleFoam`):

```cpp
SIMPLE
{
    nNonOrthogonalCorrectors 1;
    residualControl
    {
        p             1e-5;
        U             1e-5;
        "nuTilda"     1e-5;
    }
}
relaxationFactors
{
    fields
    {
        p 0.3 ;
    }
    equations
    {
        U 0.7 ;
        nuTilda   0.7 ;
    }
}
```

Residual control sets convergence criteria - the run stops once every field residual drops below its tolerance. Forces or force coefficients should also stabilize once genuinely converged. Relaxation factors govern how much each field is allowed to change per iteration: lower is more stable but slower, higher moves faster but risks oscillation.

## Function Objects and Data Extraction

Function objects run during the simulation to extract data or modify the flow field on the fly - essential for monitoring convergence, pulling aerodynamic forces, and computing propeller performance. Here's the set used to extract forces, wall shear stress, y⁺, AMI weights, and Q-criterion:

```cpp
functions
{
    #includeFunc Q
    #include "AMIWeights"
    #includeFunc solverInfo
    yPlus
    {
        type    yPlus;
        libs    (fieldFunctionObjects);
        executeControl  writeTime;
        writeControl    writeTime;
        patches (propeller wing);
    }
    wallShearStress1
    {
        type    wallShearStress;
        libs    ("libfieldFunctionObjects.so");
        patches (propeller wing);
        executeControl  writeTime;
        writeControl    writeTime;
    }
    propForce
    {
        type			forces;
        libs			("libforces.so");
        writeControl	timeStep;
        timeInterval	0.001;
        log				true;
        patches			("propeller");
        rho				rhoInf; 
        rhoInf			1.225; 
        pRef			0;
        CofR			(-0.05 0 0.54);    
        pitchAxis		(1 0 0);
    }
    wingForce
    {
        type			forces;
        libs			("libforces.so");
        writeControl	timeStep;
        timeInterval	0.001;
        log				true;
        patches			("wing");
        rho				rhoInf;     
        rhoInf			1.225;  
        pRef			0;
        CofR			(0.059 0 0.725);   
        pitchAxis		(0 0 1);
    }	
} 	
```

**Q-criterion.** Identifies vortex structures:

$$Q = \frac{1}{2}\cdot(\Omega^2 -S^2)$$

where $\Omega$ is vorticity magnitude and $S$ is strain-rate magnitude. Positive-Q regions mark vortex cores - useful for visualizing propeller tip vortices and wake structures.

**solverInfo.** Dumps detailed solver performance and residual data; handy for comparing two configurations of the same case.

**yPlus.** The dimensionless wall distance, central to turbulence-model performance and convergence:

$$y^+ = \frac{u_\tau \cdot y}{\nu}$$

where $u_\tau$ is friction velocity, $y$ wall distance, and $\nu$ kinematic viscosity.

**wallShearStress.** Governs boundary-layer behavior and drag prediction:

$$\tau_w = \mu\,\frac{\partial u}{\partial y}\bigg|_{\text{wall}}$$

High shear regions indicate flow acceleration and attached boundary layers; shear approaching zero flags potential separation.

**forces.** Computes forces from pressure and stress distribution on wall surfaces. `pitchAxis` is the axis the body rotates about; `CofR` is the center of rotation. The wing's force/moment vector resolves to lift, drag, and moment; the propeller's resolves to thrust, torque, and power, from which non-dimensional coefficients follow:

$$C_T = \frac{T}{\rho \cdot n^2 \cdot D^4}$$

$$C_P = \frac{P}{\rho \cdot n^3 \cdot D^5}$$

$$J = \frac{V}{n \cdot D}$$

$$\eta = \frac{T \cdot V}{P}$$

where $n$ is angular frequency, $D$ propeller diameter, and $V$ freestream velocity.

## Monitoring the Run

Keep an eye on four things throughout:

- **Residuals** - trending toward zero, without heavy oscillation
- **AMI interpolation weights** - staying close to 1; drifting toward zero is a red flag
- **Courant number and time step stability** - bounded, no runaway Courant number, no collapsing time step
- **Forces** - settling toward a finite value without persistent oscillation

## Appendix: Run Scripts

**Mesh generation**

```bash
#!/bin/bash
blockMesh
surfaceFeatureExtract
decomposePar -force
mpirun -np 6 snappyHexMesh -overwrite -parallel | tee log.snappyHexMesh
rm -rf 0 && cp -r 0.orig 0
reconstructParMesh -constant | tee log.reconstructParMesh
rm -rf processor*
createPatch -overwrite
renumberMesh -overwrite | tee log.renumberMesh
checkMesh -allGeometry -allTopology | tee log.checkMesh
```

**Steady-state run**

```bash
decomposePar
mpirun -np 6 simpleFoam -parallel | tee log.simpleFoam
reconstructPar  | tee log.reconstructPar
```

**Unsteady run**

```bash
decomposePar
mpirun -np 6 pimpleFoam -parallel | tee log.pimpleFoam
reconstructPar  | tee log.reconstructPar
```
