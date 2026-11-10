import numpy as np
import matplotlib.pyplot as plt

GAMMA = 1.4
M_inf = 3
deflections = [15, -15]

def shock_polar(M, theta_offset=0.0, n_points=1000):
    mu = np.degrees(np.arcsin(1 / M))          
    beta = np.linspace(mu, 90.0, n_points)    
    b_rad = np.radians(beta)  
    p_ratio = 1 + (2 * GAMMA / (GAMMA + 1)) * ((M * np.sin(b_rad))**2 - 1)
    theta_rel = np.degrees(
        np.arctan(
            (2 / np.tan(b_rad)) *
            ((M**2 * np.sin(b_rad)**2 - 1) /
             (M**2 * (GAMMA + np.cos(2 * b_rad)) + 2))
        )
    )
    theta_abs = np.concatenate([
        theta_offset + theta_rel,          
        theta_offset - theta_rel[::-1]     
    ])
    p_full = np.concatenate([p_ratio, p_ratio[::-1]])
    return theta_abs, p_full

def weak_shock_angle(M, theta_deg):
    mu = np.degrees(np.arcsin(1 / M))
    betas = np.linspace(mu, 90.0, 10000)
    for b in betas:
        b_rad = np.radians(b)
        t = np.degrees(
            np.arctan(
                (2 / np.tan(b_rad)) *
                ((M**2 * np.sin(b_rad)**2 - 1) /
                 (M**2 * (GAMMA + np.cos(2 * b_rad)) + 2))
            )
        )
        if t >= theta_deg:
            return b
    return None  

def downstream_mach(M, beta, theta):
    b_rad = np.radians(beta)
    Mn1 = M * np.sin(b_rad)
    Mn2 = np.sqrt((1 + (GAMMA - 1) / 2 * Mn1**2) /
                  (GAMMA * Mn1**2 - (GAMMA - 1) / 2))
    return Mn2 / np.sin(np.radians(beta - theta))

fig, ax = plt.subplots(figsize=(10, 6))
theta0, p0 = shock_polar(M_inf, 0.0)
plt.plot(theta0, p0, '-', color='C0', linewidth=2, label=f'$M_\infty={M_inf}$')

colors = ['C1', 'C2']
for i in range(len(deflections)):
    beta = weak_shock_angle(M_inf, abs(deflections[i]))
    if beta is None:
        continue 
    M2 = downstream_mach(M_inf, beta, abs(deflections[i]))
    if M2 >= 1.0:
        b_rad = np.radians(beta)
        p_ratio_at_shock = 1 + (2 * GAMMA / (GAMMA + 1)) * ((M_inf * np.sin(b_rad))**2 - 1)
        theta2, p2 = shock_polar(M2, theta_offset=deflections[i])
        plt.plot(theta2, p_ratio_at_shock * p2, '--', linewidth=1.5, color=colors[i], label=rf'$\theta={deflections[i]:+d}^\circ,\;M_2={M2:.2f}$')

ax.set_xlabel(r'Deflection Angle $\theta$ (deg)')
ax.set_ylabel(r'Pressure Ratio ($P / P_\infty$)')
ax.set_xlim(-50, 50)
ax.set_ylim(bottom=0)
ax.legend(loc='lower right')
ax.minorticks_on()
ax.grid(True, which='major', linestyle=':', linewidth=1.5, alpha=0.8)
ax.grid(True, which='minor', linestyle=':', linewidth=1.0, alpha=0.4)
plt.tight_layout()
plt.savefig("shockPolar_typeI.png", dpi=300, bbox_inches='tight', transparent=True)
plt.show()