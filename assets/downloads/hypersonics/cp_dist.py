import numpy as np
import pandas as pd
from scipy.optimize import brentq

M = 6.0
gamma = 1.4

theta = np.linspace(0, np.pi, 181)
delta = np.pi / 2 - theta

def tbm(beta):
    return np.arctan(2 / np.tan(beta)
                     * (M**2 * np.sin(beta)**2 - 1)
                     / (M**2 * (gamma + np.cos(2 * beta)) + 2))

betas     = np.linspace(np.arcsin(1 / M) + 1e-6, np.pi / 2 - 1e-6, 1000)
tbm_vals  = tbm(betas)
idx_max   = np.argmax(tbm_vals)
delta_det = tbm_vals[idx_max]
beta_det  = betas[idx_max]

def nu_pm(mach):
    x = max(mach**2 - 1, 0.0)
    return (np.sqrt((gamma + 1) / (gamma - 1))
            * np.arctan(np.sqrt((gamma - 1) / (gamma + 1) * x))
            - np.arctan(np.sqrt(x)))

Cp_stag = 2 / (gamma * M**2) * ((2 * gamma * M**2 - (gamma - 1)) / (gamma + 1) - 1)

Cp_newt = np.where(delta >= 0, Cp_stag * np.sin(delta)**2, 0.0)

Mn1  = M * np.sin(beta_det)
M1n  = np.sqrt(((gamma - 1) * Mn1**2 + 2) / (2 * gamma * Mn1**2 - (gamma - 1)))
M1   = M1n / np.sin(beta_det - delta_det)
p1   = (2 * gamma * Mn1**2 - (gamma - 1)) / (gamma + 1)
nu1  = nu_pm(M1)

nu_sh = nu1 + delta_det
M_sh  = brentq(lambda mach: nu_pm(mach) - nu_sh, 1.0 + 1e-9, 50.0)
p_sh  = p1 * ((1 + (gamma - 1) / 2 * M1**2)
              / (1 + (gamma - 1) / 2 * M_sh**2)) ** (gamma / (gamma - 1))

Cp_tw = np.zeros_like(theta)
for i, d in enumerate(delta):
    if d >= delta_det:
        Cp_tw[i] = Cp_stag
    elif d > 1e-6:
        b  = brentq(lambda b: tbm(b) - d, np.arcsin(1 / M) + 1e-9, beta_det - 1e-9)
        Mn = M * np.sin(b)
        Cp_tw[i] = 2 / (gamma * M**2) * ((2 * gamma * Mn**2 - (gamma - 1)) / (gamma + 1) - 1)

Cp_se = np.zeros_like(theta)
for i, d in enumerate(delta):
    if d >= delta_det:
        Cp_se[i] = Cp_stag

    elif d > 1e-9:
        nu2  = nu1 + (delta_det - d)
        M2   = brentq(lambda mach: nu_pm(mach) - nu2, 1.0 + 1e-9, 50.0)
        p2   = p1 * ((1 + (gamma - 1) / 2 * M1**2)
                     / (1 + (gamma - 1) / 2 * M2**2)) ** (gamma / (gamma - 1))
        Cp_se[i] = 2 / (gamma * M**2) * (p2 - 1)

    elif abs(d) < 1e-9:
        Cp_se[i] = 2 / (gamma * M**2) * (p_sh - 1)

    else:
        nu2 = nu_sh + abs(d)
        nu2 = min(nu2, nu_pm(50.0) - 1e-9)
        M2  = brentq(lambda mach: nu_pm(mach) - nu2, M_sh + 1e-9, 50.0)
        p2  = p_sh * ((1 + (gamma - 1) / 2 * M_sh**2)
                      / (1 + (gamma - 1) / 2 * M2**2)) ** (gamma / (gamma - 1))
        Cp_se[i] = 2 / (gamma * M**2) * (p2 - 1)

df = pd.DataFrame({
    "theta_deg":         np.degrees(theta),
    "delta_deg":         np.degrees(delta),
    "Cp_Newtonian":      Cp_newt,
    "Cp_TangentWedge":   Cp_tw,
    "Cp_ShockExpansion": Cp_se,
})
df.to_csv("cylinder_Cp.csv", index=False)
print(df.to_string(index=False))