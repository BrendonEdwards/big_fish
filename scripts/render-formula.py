#!/usr/bin/env python3
"""Render the Edwards Polygon definition to public/edwards-polygon.svg.

DEV ONLY. matplotlib lives in scripts/.venv and is never shipped or run by
the build/CI. Re-run to regenerate:
    scripts/.venv/bin/python scripts/render-formula.py
"""
from pathlib import Path

import matplotlib
matplotlib.use("svg")
import matplotlib.pyplot as plt

matplotlib.rcParams["mathtext.fontset"] = "cm"  # Computer Modern, academic look

LINES = [
    r"$H(P) = \{\, q : h_q > h_P,\ \delta(P,q) > \varepsilon \,\}$",
    r"$\rho(\theta, q) = \arctan\left( \dfrac{\tan(d_q / 2)}{\cos(\theta - \alpha_q)} \right)$",
    r"$j(\theta) = \mathrm{argmin}_{\, q \in H}\ \rho(\theta, q)$",
    r"$V = \{\, q \in H : \exists\, \theta,\ j(\theta) = q \,\}$",
    r"$A(E) = R^2 \int_{0}^{2\pi} \left( 1 - \cos r(\theta) \right)\, d\theta$",
    r"$\min_{\theta}\ r(\theta) = \mathrm{isolation}(P)$",
]

fig = plt.figure(figsize=(6.2, 4.4))
fig.patch.set_alpha(0.0)
y = 0.94
for line in LINES:
    fig.text(0.5, y, line, ha="center", va="top", fontsize=19, color="#0b1a2b")
    y -= 0.16
out = Path(__file__).resolve().parent.parent / "public" / "edwards-polygon.svg"
fig.savefig(out, format="svg", bbox_inches="tight", transparent=True)
print(f"wrote {out}")
