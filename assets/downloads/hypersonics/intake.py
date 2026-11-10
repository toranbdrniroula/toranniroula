import math

GAMMA = 1.4
M1, PI, H_ISO = 6.0, 20.0, 0.05

def tbm(M, b):
    sb = math.sin(b)
    Mn1sq = (M * sb) ** 2
    return math.atan(2*(Mn1sq-1) / (math.tan(b)*(M**2*(GAMMA+math.cos(2*b))+2)))

def solve_beta(M, theta_deg):
    theta = math.radians(theta_deg)
    mu = math.asin(1/M)
    beta = mu + math.radians(3)
    for _ in range(300):
        f  = tbm(M, beta) - theta
        df = (tbm(M, beta+1e-7) - tbm(M, beta-1e-7)) / 2e-7
        if abs(df) < 1e-15: break
        beta = max(mu+1e-6, min(beta + max(min(-f/df, math.radians(0.5)), math.radians(-0.5)), math.pi/2-1e-6))
        if abs(f) < 1e-10: break
    return beta

def p_ratio(M, b):
    Mn1 = M * math.sin(b)
    return (2*GAMMA*Mn1**2 - (GAMMA-1)) / (GAMMA+1)

def rho_ratio(M, b):
    Mn1 = M * math.sin(b)
    return ((GAMMA+1)*Mn1**2) / ((GAMMA-1)*Mn1**2 + 2)

def M_down(M, b, theta):
    Mn1 = M * math.sin(b)
    Mn2sq = (1 + (GAMMA-1)/2*Mn1**2) / (GAMMA*Mn1**2 - (GAMMA-1)/2)
    return math.sqrt(Mn2sq) / math.sin(b - theta)

def max_deflection(M):
    mu = math.asin(1/M)
    return max(tbm(M, math.radians(b)) for b in range(int(math.degrees(mu))+1, 90))

def solve_theta(M1, pi_target):
    lo, hi = 0.1, math.degrees(max_deflection(M1)) * 0.95
    for _ in range(120):
        theta = 0.5*(lo+hi)
        b1 = solve_beta(M1, theta)
        M2 = M_down(M1, b1, math.radians(theta))
        if theta >= math.degrees(max_deflection(M2)):
            hi = theta; continue
        b2 = solve_beta(M2, theta)
        p31 = p_ratio(M1, b1) * p_ratio(M2, b2)
        if abs(p31 - pi_target) < 1e-8: break
        lo, hi = (theta, hi) if p31 < pi_target else (lo, theta)
    return 0.5*(lo+hi)

theta_deg = solve_theta(M1, PI)
theta     = math.radians(theta_deg)
b1        = solve_beta(M1, theta_deg)
M2        = M_down(M1, b1, theta)
b2        = solve_beta(M2, theta_deg)
M3        = M_down(M2, b2, theta)
p21       = p_ratio(M1, b1)
p32       = p_ratio(M2, b2)
p31       = p21 * p32

m    = math.tan(theta - b2)
x_s  = H_ISO * (m - math.tan(b1)) / (m * (math.tan(b1) - math.tan(theta)))
L_ramp = x_s / math.cos(theta)

t1 = 1 + 0.5*(GAMMA-1)*M1**2
t3 = 1 + 0.5*(GAMMA-1)*M3**2
tpr = p31 * (t3/t1) ** (GAMMA/(GAMMA-1))

print(f"Inputs:  M={M1}  p3/p1={PI}  H_iso={H_ISO} m")
print(f"Theta (ramp angle):   {theta_deg:.4f} deg")
print(f"Beta1 (LE shock):     {math.degrees(b1):.4f} deg")
print(f"Beta2 (cowl shock):   {math.degrees(b2):.4f} deg")
print(f"Ramp length:          {L_ramp:.5f} m")
print(f"Total pressure recovery: {tpr:.5f}")