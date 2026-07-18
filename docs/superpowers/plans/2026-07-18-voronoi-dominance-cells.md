# Voronoi Dominance Cells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click a summit on the Big Fish globe and see its "dominance cell" — the doubled spherical-Voronoi polygon whose boundary passes through the higher peaks that hem it in — plus markers for those peaks, replacing the isolation-circle layer.

**Architecture:** An offline Python pipeline (`scripts/build_cells.py` + `scripts/cell_geometry.py`) downloads/caches the GeoNames `allCountries` dump, computes each summit's cell by doubled-bisector radial sampling, and writes one static GeoJSON per summit to `public/data/cells/`. The front-end (`src/main.js`) lazily fetches the clicked summit's file and renders it as MapLibre fill/line/circle/symbol layers. No runtime GIS, no new front-end dependencies.

**Tech Stack:** Vanilla JS + MapLibre GL 5.6 (existing), Python 3.12 + NumPy + shapely + antimeridian (offline only), pytest for geometry tests, Playwright for the browser smoke test.

**Spec:** `docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md` (read it first).

## Global Constraints

- NOTE (2026-07-18, post-audit): the GeoNames feature-code list and test counts below were superseded by the data-audit round — the spec is authoritative (codes PK/PKS/MT/VLC/HLL; stale-elevation guard; 15 Python tests).
- Work happens in `~/Developer/big_fish` on branch `feature/voronoi-dominance-cells`.
- Python binary: `/opt/homebrew/opt/python@3.12/bin/python3.12` (system `python3` is 3.9 — too old). Venv lives at `scripts/.venv`, never committed.
- No new front-end runtime dependencies; `src/main.js` stays vanilla ES module, single quotes, 2-space indent, semicolons (match existing style).
- Geometry constants (exact values from spec): 1,440 bearings; boundary `R(θ) = min(2·min_q ρ(θ,q), 179°)` with `ρ(θ,q) = atan2(tan(d_q/2), cos(θ−α_q)) mod π`; `d_q/2` clamped below 89.9°; strict `elevation > summit.elevationM`; self-exclusion radius 2 km; Earth radius 6371.0088 km.
- GeoNames feature filter: class `T`, codes `PK, PKS, MT, MTS, VLC, HLL, HLLS`; `elevation` column (index 15), falling back to `dem` (index 16); reject missing/sentinel (≤ −1000) values.
- Cell files: `public/data/cells/<id>.json` (committed). No file for Everest. Ring coordinates rounded to 3 decimals.
- `scripts/build-cells.py` in the spec is implemented as `scripts/build_cells.py` (underscore) so pytest can import its parse function; Task 1 updates the spec reference.
- `scripts/build_cells.py` must not be run by CI/builds — it is a developer-run generator; `npm run build` only copies `public/`.
- Hard validation (build aborts): `d_min ≤ min(R) ≤ d_min × 1.0001`; NHN within 50 km of the boundary point at its bearing; Aconcagua computed isolation within 5% of 16,520 km. Wikipedia mismatches only WARN in `scripts/cell-report.md`.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Repo plumbing + summit export script

**Files:**
- Modify: `.gitignore`
- Modify: `docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md` (filename references only)
- Create: `scripts/export-summits.mjs`

**Interfaces:**
- Consumes: `const peakData = [...]` array literal in `src/main.js` (regex-extracted, evaluated in Node).
- Produces: `scripts/.cache/summits.json` — array of 40 objects `{id, name, elevationM, latitude, longitude, isolationKm, nhn: {name, latitude, longitude} | null, notes}` — consumed by `build_cells.py` (Task 6). Not committed (lives in `.cache`).

- [ ] **Step 1: Extend `.gitignore`**

Replace its full contents with:

```
dist/
node_modules/
scripts/.cache/
scripts/.venv/
```

- [ ] **Step 2: Update spec filename references**

Run: `sed -i '' 's/build-cells\.py/build_cells.py/g' docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md`

- [ ] **Step 3: Write `scripts/export-summits.mjs`**

```js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const match = src.match(/const peakData = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('peakData array not found in src/main.js');
const peaks = new Function(`return ${match[1]};`)();
if (peaks.length !== 40) throw new Error(`expected 40 summits, got ${peaks.length}`);
if (!peaks.some((peak) => peak.id === 'everest')) throw new Error('everest missing from peakData');
mkdirSync(new URL('./.cache', import.meta.url), { recursive: true });
writeFileSync(new URL('./.cache/summits.json', import.meta.url), JSON.stringify(peaks, null, 2));
console.log(`wrote ${peaks.length} summits to scripts/.cache/summits.json`);
```

- [ ] **Step 4: Run it (this is the test — the script self-asserts)**

Run: `node scripts/export-summits.mjs`
Expected: `wrote 40 summits to scripts/.cache/summits.json`

Run: `node -e "const s=require('./scripts/.cache/summits.json'); console.log(s.length, s.find(p=>p.id==='aconcagua').isolationKm)"`
Expected: `40 16520`

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/export-summits.mjs docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md
git commit -m "Add summit export script and ignore generated caches

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Python env + spherical primitives (distance/bearing/destination)

**Files:**
- Create: `scripts/.venv/` (not committed)
- Create: `scripts/cell_geometry.py`
- Test: `scripts/test_cell_geometry.py`

**Interfaces:**
- Produces (consumed by Tasks 3–6):
  - `EARTH_RADIUS_KM = 6371.0088`
  - `angular_distance_and_bearing(lat0: float, lon0: float, lats: np.ndarray, lons: np.ndarray) -> (d, alpha)` — degrees in, radian arrays out; `d` great-circle angular distance, `alpha` initial bearing in `[0, 2π)` clockwise from north.
  - `destination(lat0: float, lon0: float, bearings: np.ndarray, dists: np.ndarray) -> (lats_deg, lons_deg)` — degrees origin + radian arrays in, degree arrays out, longitudes wrapped to `[-180, 180)`.

- [ ] **Step 1: Create venv and install dependencies**

```bash
/opt/homebrew/opt/python@3.12/bin/python3.12 -m venv scripts/.venv
scripts/.venv/bin/pip install --quiet numpy shapely antimeridian pytest
scripts/.venv/bin/python -c "import numpy, shapely, antimeridian; print('deps ok')"
```

Expected: `deps ok`

- [ ] **Step 2: Write the failing tests**

Create `scripts/test_cell_geometry.py`:

```python
import numpy as np

from cell_geometry import angular_distance_and_bearing, destination


def test_angular_distance_and_bearing_cardinal_points():
    d, alpha = angular_distance_and_bearing(
        0.0, 0.0, np.array([0.0, 45.0, 0.0]), np.array([90.0, 0.0, -90.0])
    )
    assert np.allclose(d, [np.pi / 2, np.pi / 4, np.pi / 2])
    assert np.allclose(np.degrees(alpha), [90.0, 0.0, 270.0])


def test_destination_cardinal_points():
    lats, lons = destination(0.0, 0.0, np.array([np.pi / 2, 0.0]), np.array([np.pi / 2, np.pi / 4]))
    assert np.allclose(lats, [0.0, 45.0], atol=1e-9)
    assert np.allclose(lons, [90.0, 0.0], atol=1e-9)


def test_destination_roundtrips_through_distance_and_bearing():
    rng = np.random.default_rng(42)
    bearings = rng.uniform(0, 2 * np.pi, 200)
    dists = rng.uniform(0.05, 2.5, 200)
    lats, lons = destination(37.7, -122.4, bearings, dists)
    d, alpha = angular_distance_and_bearing(37.7, -122.4, lats, lons)
    assert np.allclose(d, dists, atol=1e-9)
    angle_gap = np.mod(alpha - bearings + np.pi, 2 * np.pi) - np.pi
    assert np.allclose(angle_gap, 0.0, atol=1e-9)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'cell_geometry'`

- [ ] **Step 4: Write the implementation**

Create `scripts/cell_geometry.py`:

```python
"""Spherical geometry for dominance cells (doubled Voronoi cells).

All angles internal to this module are radians; public inputs/outputs use
degrees for coordinates, radians for distances/bearings unless noted.
"""
import numpy as np

EARTH_RADIUS_KM = 6371.0088
CAP_DEGREES = 179.0


def angular_distance_and_bearing(lat0, lon0, lats, lons):
    """Great-circle angular distance (radians) and initial bearing
    (radians, clockwise from north, in [0, 2*pi)) from one point to many."""
    phi0, lam0 = np.radians(lat0), np.radians(lon0)
    phi, lam = np.radians(lats), np.radians(lons)
    dlam = lam - lam0
    a = np.sin((phi - phi0) / 2) ** 2 + np.cos(phi0) * np.cos(phi) * np.sin(dlam / 2) ** 2
    d = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    bearing = np.arctan2(
        np.sin(dlam) * np.cos(phi),
        np.cos(phi0) * np.sin(phi) - np.sin(phi0) * np.cos(phi) * np.cos(dlam),
    )
    return d, np.mod(bearing, 2 * np.pi)


def destination(lat0, lon0, bearings, dists):
    """Point reached from (lat0, lon0) along each bearing/distance (radians).
    Returns (lats_deg, lons_deg) with longitudes wrapped to [-180, 180)."""
    phi0 = np.radians(lat0)
    lam0 = np.radians(lon0)
    lat = np.arcsin(np.sin(phi0) * np.cos(dists) + np.cos(phi0) * np.sin(dists) * np.cos(bearings))
    lon = lam0 + np.arctan2(
        np.sin(bearings) * np.sin(dists) * np.cos(phi0),
        np.cos(dists) - np.sin(phi0) * np.sin(lat),
    )
    lon = np.mod(lon + np.pi, 2 * np.pi) - np.pi
    return np.degrees(lat), np.degrees(lon)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add scripts/cell_geometry.py scripts/test_cell_geometry.py
git commit -m "Add spherical distance/bearing/destination primitives

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Doubled-bisector boundary sampling

**Files:**
- Modify: `scripts/cell_geometry.py`
- Test: `scripts/test_cell_geometry.py`

**Interfaces:**
- Produces: `boundary_distances(d: np.ndarray, alpha: np.ndarray, n_bearings=1440, cap_deg=CAP_DEGREES, chunk=10000) -> (theta, R, idx)` — for higher peaks at angular distances `d` / bearings `alpha` (radians), returns the bearing grid `theta` (radians, `[0, 2π)`), boundary distance `R` per bearing (radians, capped), and `idx` the winning peak index per bearing. Peak-chunked to bound memory (~1440×10000 floats per chunk).

- [ ] **Step 1: Write the failing tests** (append to `scripts/test_cell_geometry.py`)

```python
from cell_geometry import CAP_DEGREES, boundary_distances


def test_boundary_single_peak_due_north():
    theta, R, idx = boundary_distances(np.array([np.radians(20.0)]), np.array([0.0]))
    assert len(theta) == 1440 and theta[0] == 0.0
    assert np.isclose(R[0], np.radians(20.0))          # boundary passes through the peak
    assert np.isclose(R[360], np.radians(CAP_DEGREES))  # θ=90°: bisector at 90° → doubled hits cap
    assert np.isclose(R[720], np.radians(CAP_DEGREES))  # θ=180°: far side capped
    assert np.isclose(R.min(), np.radians(20.0))
    assert (idx == 0).all()


def test_boundary_two_opposite_peaks():
    d = np.radians(np.array([20.0, 30.0]))
    alpha = np.radians(np.array([0.0, 180.0]))
    theta, R, idx = boundary_distances(d, alpha)
    assert np.isclose(R[0], np.radians(20.0)) and idx[0] == 0
    assert np.isclose(R[720], np.radians(30.0)) and idx[720] == 1
    assert np.isclose(R.min(), np.radians(20.0))


def test_boundary_chunking_is_transparent():
    rng = np.random.default_rng(7)
    d = rng.uniform(0.05, 2.8, 100)
    alpha = rng.uniform(0, 2 * np.pi, 100)
    _, r_small, i_small = boundary_distances(d, alpha, chunk=7)
    _, r_big, i_big = boundary_distances(d, alpha, chunk=100000)
    assert np.allclose(r_small, r_big)
    assert (i_small == i_big).all()


def test_boundary_isolation_invariant_random_field():
    from cell_geometry import angular_distance_and_bearing, destination

    rng = np.random.default_rng(11)
    d = rng.uniform(0.05, 2.8, 500)
    alpha = rng.uniform(0, 2 * np.pi, 500)
    theta, R, _ = boundary_distances(d, alpha)
    d_min = d.min()
    assert d_min <= R.min() <= d_min * 1.0001          # min boundary distance == isolation
    nearest = int(np.argmin(d))
    grid = int(np.argmin(np.abs(np.mod(theta - alpha[nearest] + np.pi, 2 * np.pi) - np.pi)))
    blat, blon = destination(10.0, 20.0, theta[grid : grid + 1], R[grid : grid + 1])
    plat, plon = destination(10.0, 20.0, alpha[nearest : nearest + 1], d[nearest : nearest + 1])
    gap, _ = angular_distance_and_bearing(float(blat[0]), float(blon[0]), plat, plon)
    assert gap[0] <= np.radians(0.5)                   # nearest higher peak lies on the boundary
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: FAIL — `ImportError: cannot import name 'boundary_distances'`

- [ ] **Step 3: Implement** (append to `scripts/cell_geometry.py`)

```python
def boundary_distances(d, alpha, n_bearings=1440, cap_deg=CAP_DEGREES, chunk=10000):
    """Doubled-Voronoi cell boundary distance per compass bearing.

    For each bearing theta, the spherical Voronoi bisector of peak i first
    crosses the geodesic at rho = atan2(tan(d_i/2), cos(theta - alpha_i))
    taken mod pi (Napier's rule; the bisector's closest approach to the
    summit is d_i/2 along bearing alpha_i). The dominance-cell boundary is
    min_i(2 * rho), capped just inside the antipode so the ring stays a
    valid polygon. Peaks are processed in chunks to bound memory.

    Returns (theta, R, idx): bearing grid, boundary distance (radians,
    capped at cap_deg), and the index of the winning peak per bearing.
    """
    theta = np.linspace(0, 2 * np.pi, n_bearings, endpoint=False)
    half = np.clip(d / 2, 1e-9, np.radians(89.9))
    tan_half = np.tan(half)
    best_rho = np.full(n_bearings, np.pi)
    best_idx = np.zeros(n_bearings, dtype=np.int64)
    rows = np.arange(n_bearings)
    for start in range(0, len(d), chunk):
        stop = start + chunk
        rho = np.mod(
            np.arctan2(tan_half[None, start:stop], np.cos(theta[:, None] - alpha[None, start:stop])),
            np.pi,
        )
        local = np.argmin(rho, axis=1)
        local_rho = rho[rows, local]
        better = local_rho < best_rho
        best_rho[better] = local_rho[better]
        best_idx[better] = local[better] + start
    return theta, np.minimum(2 * best_rho, np.radians(cap_deg)), best_idx
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/cell_geometry.py scripts/test_cell_geometry.py
git commit -m "Add doubled-bisector boundary sampling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Ring building, pole containment, GeoJSON legality

**Files:**
- Modify: `scripts/cell_geometry.py`
- Test: `scripts/test_cell_geometry.py`

**Interfaces:**
- Produces:
  - `cell_ring(lat0, lon0, theta, R) -> (lats_deg, lons_deg)` — ring vertices rounded to 3 decimals, consecutive duplicates dropped.
  - `poles_inside(lat0, theta, R) -> (north: bool, south: bool)` — exact star-shaped containment test.
  - `ring_to_geojson_geometry(lats, lons, north_pole, south_pole) -> dict` — GeoJSON geometry mapping (Polygon or MultiPolygon), antimeridian-split, pole-safe.

- [ ] **Step 1: Write the failing tests** (append to `scripts/test_cell_geometry.py`)

```python
from shapely.geometry import Point, shape

from cell_geometry import cell_ring, poles_inside, ring_to_geojson_geometry


def _cell(lat0, lon0, d, alpha):
    theta, R, _ = boundary_distances(d, alpha)
    north, south = poles_inside(lat0, theta, R)
    lats, lons = cell_ring(lat0, lon0, theta, R)
    return ring_to_geojson_geometry(lats, lons, north, south)


def test_poles_inside_star_shaped_tests():
    theta = np.linspace(0, 2 * np.pi, 1440, endpoint=False)
    assert poles_inside(0.0, theta, np.full(1440, np.radians(100.0))) == (True, True)
    assert poles_inside(0.0, theta, np.full(1440, np.radians(80.0))) == (False, False)
    lopsided = np.full(1440, np.radians(80.0))
    lopsided[:5] = np.radians(95.0)  # bearing ~0° reaches past the north pole
    assert poles_inside(0.0, theta, lopsided) == (True, False)


def test_cell_ring_drops_consecutive_duplicates():
    theta, R, _ = boundary_distances(np.array([np.radians(20.0)]), np.array([0.0]))
    lats, lons = cell_ring(0.0, 0.0, theta, R)
    pairs = list(zip(lats.tolist(), lons.tolist()))
    assert all(a != b for a, b in zip(pairs, pairs[1:]))


def test_geometry_simple_cell_is_valid_polygon():
    rng = np.random.default_rng(3)
    alpha = rng.uniform(0, 2 * np.pi, 24)
    d = np.full(24, np.radians(10.0))
    geometry = _cell(0.0, 0.0, d, alpha)
    geom = shape(geometry)
    assert geometry["type"] == "Polygon" and geom.is_valid
    assert -11 < geom.bounds[0] and geom.bounds[2] < 11


def test_geometry_antimeridian_cell_splits():
    rng = np.random.default_rng(4)
    alpha = rng.uniform(0, 2 * np.pi, 24)
    d = np.full(24, np.radians(5.0))
    geometry = _cell(0.0, 179.5, d, alpha)
    geom = shape(geometry)
    assert geometry["type"] == "MultiPolygon" and geom.is_valid
    assert geom.bounds[0] >= -180 and geom.bounds[2] <= 180


def test_geometry_south_pole_cell():
    rng = np.random.default_rng(5)
    alpha = rng.uniform(0, 2 * np.pi, 24)
    d = np.full(24, np.radians(5.0))
    geometry = _cell(-89.0, 0.0, d, alpha)
    geom = shape(geometry)
    assert geom.is_valid
    assert geom.bounds[1] == -90.0  # ring closed through the south pole


def test_geometry_both_poles_world_with_hole():
    # Single higher peak due east: cap engaged on the far side, both poles inside.
    geometry = _cell(0.0, 0.0, np.array([np.radians(40.0)]), np.array([np.pi / 2]))
    geom = shape(geometry)
    assert geom.is_valid
    # shapely Point takes (lon, lat)
    assert geom.contains(Point(-30.0, 0.0))      # west of the summit: inside
    assert geom.contains(Point(-100.0, 0.0))     # far west: inside (far side capped at 179°)
    assert not geom.contains(Point(60.0, 0.0))   # beyond the eastern frontier: outside
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: FAIL — `ImportError: cannot import name 'cell_ring'`

- [ ] **Step 3: Implement** (append to `scripts/cell_geometry.py`)

```python
import antimeridian
from shapely.geometry import Polygon, box, mapping


def cell_ring(lat0, lon0, theta, R):
    """Ring vertices (degrees, 3-decimal rounded, consecutive dups dropped)."""
    lats, lons = destination(lat0, lon0, theta, R)
    lats, lons = np.round(lats, 3), np.round(lons, 3)
    keep = np.ones(len(lats), dtype=bool)
    keep[1:] = (np.diff(lats) != 0) | (np.diff(lons) != 0)
    return lats[keep], lons[keep]


def poles_inside(lat0, theta, R):
    """Exact pole containment for a ring star-shaped about the summit:
    the geodesic at bearing 0 runs straight to the north pole (bearing pi
    to the south pole), so compare the boundary distance there with the
    summit's colatitude."""
    north = R[int(np.argmin(np.abs(theta)))] > np.radians(90.0 - lat0)
    south = R[int(np.argmin(np.abs(theta - np.pi)))] > np.radians(90.0 + lat0)
    return bool(north), bool(south)


def ring_to_geojson_geometry(lats, lons, north_pole, south_pole):
    """GeoJSON geometry for the ring: antimeridian-split, pole-safe.

    Both poles inside means a near-global cell; represent it as the world
    rectangle minus the complement blob (the same ring, reversed, is the
    boundary of the excluded region around the summit's antipode).
    """
    coords = list(zip(lons.tolist(), lats.tolist()))
    coords.append(coords[0])
    if north_pole and south_pole:
        blob = antimeridian.fix_polygon(Polygon(coords[::-1]))
        return mapping(box(-180.0, -90.0, 180.0, 90.0).difference(blob))
    return mapping(
        antimeridian.fix_polygon(
            Polygon(coords), force_north_pole=north_pole, force_south_pole=south_pole
        )
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `scripts/.venv/bin/pytest scripts/test_cell_geometry.py -q`
Expected: `13 passed`

If `test_geometry_south_pole_cell` fails on the exact `-90.0` bound, inspect what `antimeridian.fix_polygon(..., force_south_pole=True)` produced (`print(geom.bounds)`) — assert `geom.bounds[1] <= -89.9` instead if it closes slightly above the pole; the visual result is identical under MapLibre's ±85° clip.

- [ ] **Step 5: Commit**

```bash
git add scripts/cell_geometry.py scripts/test_cell_geometry.py
git commit -m "Add ring building, pole containment, and GeoJSON legality handling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: GeoNames loading and filtering

**Files:**
- Create: `scripts/build_cells.py` (parse + load functions only in this task)
- Test: `scripts/test_build_cells.py`

**Interfaces:**
- Consumes: nothing from other tasks yet.
- Produces (consumed by Task 6's `main`):
  - `parse_geonames_lines(lines: iterable[str]) -> (names: np.ndarray[object], lats: np.ndarray, lons: np.ndarray, elevs: np.ndarray[int64])`
  - `load_geonames(cache_dir: Path) -> same tuple` — downloads `allCountries.zip` (~400 MB) into `cache_dir` once, then streams/parses it.
  - Constants: `FEATURE_CODES`, `GEONAMES_URL`, `SELF_EXCLUSION_KM = 2.0`, `EXTRA_EXCLUSION_KM = {}`, `DATASET_NOTE`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test_build_cells.py`:

```python
from build_cells import parse_geonames_lines

# GeoNames tab-separated columns: geonameid, name, asciiname, alternatenames,
# lat, lon, feature class, feature code, country, cc2, admin1-4, population,
# elevation, dem, timezone, modification date (19 columns).
FIXTURE = [
    "1\tTest Peak\tTest Peak\t\t10.5\t20.5\tT\tPK\tCH\t\t\t\t\t\t0\t3000\t2990\tEurope/Zurich\t2024-01-01",
    "2\tDem Mountain\tDem Mountain\t\t-5.0\t30.0\tT\tMT\tTZ\t\t\t\t\t\t0\t\t1500\tAfrica/Dar_es_Salaam\t2024-01-01",
    "3\tLow Hill\tLow Hill\t\t32.25\t-64.85\tT\tHLL\tBM\t\t\t\t\t\t0\t14\t12\tAtlantic/Bermuda\t2024-01-01",
    "4\tSome Town\tSome Town\t\t1.0\t1.0\tP\tPPL\tFR\t\t\t\t\t\t100\t200\t200\tEurope/Paris\t2024-01-01",
    "5\tNo Elev Peak\tNo Elev Peak\t\t2.0\t2.0\tT\tPK\tFR\t\t\t\t\t\t0\t\t-9999\tEurope/Paris\t2024-01-01",
    "6\tSpot Ridge\tSpot Ridge\t\t3.0\t3.0\tT\tRDGE\tFR\t\t\t\t\t\t0\t500\t500\tEurope/Paris\t2024-01-01",
]


def test_parse_geonames_filters_to_elevated_mountain_features():
    names, lats, lons, elevs = parse_geonames_lines(FIXTURE)
    assert names.tolist() == ["Test Peak", "Dem Mountain", "Low Hill"]
    assert lats.tolist() == [10.5, -5.0, 32.25]
    assert lons.tolist() == [20.5, 30.0, -64.85]
    assert elevs.tolist() == [3000, 1500, 14]  # Dem Mountain fell back to the dem column
```

- [ ] **Step 2: Run test to verify it fails**

Run: `scripts/.venv/bin/pytest scripts/test_build_cells.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'build_cells'`

- [ ] **Step 3: Implement**

Create `scripts/build_cells.py`:

```python
#!/usr/bin/env python3
"""Build dominance-cell GeoJSON for every summit in the app.

Run offline by a developer (never by CI):

    node scripts/export-summits.mjs
    scripts/.venv/bin/python scripts/build_cells.py

Downloads and caches the GeoNames allCountries dump (~400 MB, first run
only), then writes public/data/cells/<id>.json per summit plus a
validation report at scripts/cell-report.md.
"""
import io
import json
import urllib.request
import zipfile
from pathlib import Path

import numpy as np

SCRIPTS = Path(__file__).resolve().parent
CACHE = SCRIPTS / ".cache"
OUTPUT = SCRIPTS.parent / "public" / "data" / "cells"
GEONAMES_URL = "https://download.geonames.org/export/dump/allCountries.zip"
FEATURE_CODES = {"PK", "PKS", "MT", "MTS", "VLC", "HLL", "HLLS"}
SELF_EXCLUSION_KM = 2.0
# Widen the exclusion radius for a summit id if cell-report.md flags a
# suspicious (< 50 km) computed isolation caused by a duplicate or
# mis-located catalogue entry for the summit itself.
EXTRA_EXCLUSION_KM = {}
DATASET_NOTE = (
    "Cell derived from GeoNames catalogued peaks (PK/PKS/MT/MTS/VLC/HLL/HLLS); "
    "coverage is thinnest near sea level."
)


def parse_geonames_lines(lines):
    """Filter GeoNames rows to mountain-type features with an elevation."""
    names, lats, lons, elevs = [], [], [], []
    for line in lines:
        cols = line.rstrip("\n").split("\t")
        if len(cols) < 17 or cols[6] != "T" or cols[7] not in FEATURE_CODES:
            continue
        raw = cols[15] or cols[16]
        try:
            elev = int(raw)
        except ValueError:
            continue
        if elev <= -1000:  # GeoNames dem sentinel (-9999)
            continue
        names.append(cols[1])
        lats.append(float(cols[4]))
        lons.append(float(cols[5]))
        elevs.append(elev)
    return (
        np.array(names, dtype=object),
        np.array(lats),
        np.array(lons),
        np.array(elevs, dtype=np.int64),
    )


def load_geonames(cache_dir):
    cache_dir.mkdir(parents=True, exist_ok=True)
    zip_path = cache_dir / "allCountries.zip"
    if not zip_path.exists():
        print("downloading GeoNames allCountries.zip (~400 MB, one-time)...")
        urllib.request.urlretrieve(GEONAMES_URL, zip_path)
    with zipfile.ZipFile(zip_path) as zf, zf.open("allCountries.txt") as fh:
        return parse_geonames_lines(io.TextIOWrapper(fh, encoding="utf-8"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `scripts/.venv/bin/pytest scripts/test_build_cells.py -q`
Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/build_cells.py scripts/test_build_cells.py
git commit -m "Add GeoNames download, parse, and mountain-feature filtering

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Cell builder main — generate the 39 cell files + report

**Files:**
- Modify: `scripts/build_cells.py`
- Create (generated, committed): `public/data/cells/*.json` (39 files), `scripts/cell-report.md`

**Interfaces:**
- Consumes: everything from Tasks 2–5, plus `scripts/.cache/summits.json` (Task 1).
- Produces: `public/data/cells/<id>.json` — FeatureCollection consumed by the front-end (Task 7):
  - Feature 0: Polygon/MultiPolygon, properties `{summitId, computedIsolationKm, nearestHigherName, nearestHigherElevationM, contributingPeakCount, datasetNote}`.
  - Features 1..N: Points, properties `{name, elevationM, distanceKm, bearingDeg}`.

- [ ] **Step 1: Append the builder to `scripts/build_cells.py`**

```python
def build_cell(summit, names, lats, lons, elevs):
    """Return (feature_collection | None, report_row) for one summit."""
    higher = elevs > summit["elevationM"]
    row = {
        "id": summit["id"],
        "name": summit["name"],
        "wiki_iso": summit["isolationKm"],
        "wiki_nhn": (summit.get("nhn") or {}).get("name"),
        "computed_iso": None,
        "computed_nhn": None,
        "contributing": 0,
        "flags": [],
    }
    if not higher.any():
        row["flags"].append("global high point — no cell")
        return None, row

    from cell_geometry import (
        EARTH_RADIUS_KM,
        angular_distance_and_bearing,
        boundary_distances,
        cell_ring,
        destination,
        poles_inside,
        ring_to_geojson_geometry,
    )

    lat0, lon0 = summit["latitude"], summit["longitude"]
    d, alpha = angular_distance_and_bearing(lat0, lon0, lats[higher], lons[higher])
    exclusion = EXTRA_EXCLUSION_KM.get(summit["id"], SELF_EXCLUSION_KM) / EARTH_RADIUS_KM
    keep = d > exclusion
    d, alpha = d[keep], alpha[keep]
    names_h = names[higher][keep]
    lats_h, lons_h = lats[higher][keep], lons[higher][keep]
    if len(d) == 0:
        row["flags"].append("no catalogued higher peaks beyond exclusion radius")
        return None, row

    theta, R, idx = boundary_distances(d, alpha)
    nearest = int(np.argmin(d))
    computed_iso_km = float(R.min()) * EARTH_RADIUS_KM

    # Hard invariants (spec: Validation).
    assert d[nearest] <= R.min() + 1e-12, summit["id"]
    assert R.min() <= d[nearest] * 1.0001, summit["id"]
    grid = int(np.argmin(np.abs(np.mod(theta - alpha[nearest] + np.pi, 2 * np.pi) - np.pi)))
    blat, blon = destination(lat0, lon0, theta[grid : grid + 1], R[grid : grid + 1])
    gap, _ = angular_distance_and_bearing(
        float(blat[0]), float(blon[0]), lats_h[nearest : nearest + 1], lons_h[nearest : nearest + 1]
    )
    assert gap[0] * EARTH_RADIUS_KM <= 50.0, (
        f"{summit['id']}: NHN {gap[0] * EARTH_RADIUS_KM:.1f} km off boundary"
    )

    rlats, rlons = cell_ring(lat0, lon0, theta, R)
    north, south = poles_inside(lat0, theta, R)
    geometry = ring_to_geojson_geometry(rlats, rlons, north, south)

    contributing = np.unique(idx)
    features = [
        {
            "type": "Feature",
            "properties": {
                "summitId": summit["id"],
                "computedIsolationKm": round(computed_iso_km, 1),
                "nearestHigherName": str(names_h[nearest]),
                "nearestHigherElevationM": int(elevs[higher][keep][nearest]),
                "contributingPeakCount": int(len(contributing)),
                "datasetNote": DATASET_NOTE,
            },
            "geometry": geometry,
        }
    ]
    for i in contributing:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": str(names_h[i]),
                    "elevationM": int(elevs[higher][keep][i]),
                    "distanceKm": round(float(d[i]) * EARTH_RADIUS_KM, 1),
                    "bearingDeg": round(float(np.degrees(alpha[i])), 1),
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(lons_h[i]), 4), round(float(lats_h[i]), 4)],
                },
            }
        )

    row["computed_iso"] = round(computed_iso_km, 1)
    row["computed_nhn"] = str(names_h[nearest])
    row["contributing"] = int(len(contributing))
    if computed_iso_km < 50.0:
        row["flags"].append("SUSPICIOUS: computed isolation < 50 km (duplicate catalogue entry?)")
    if summit["isolationKm"]:
        delta = abs(computed_iso_km - summit["isolationKm"]) / summit["isolationKm"]
        if delta > 0.10:
            row["flags"].append(f"WARN: {delta:.0%} off Wikipedia isolation")
    return {"type": "FeatureCollection", "features": features}, row


def main():
    summits_path = CACHE / "summits.json"
    if not summits_path.exists():
        raise SystemExit("scripts/.cache/summits.json missing — run: node scripts/export-summits.mjs")
    summits = json.loads(summits_path.read_text())
    names, lats, lons, elevs = load_geonames(CACHE)
    print(f"{len(elevs):,} candidate peaks loaded from GeoNames")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    rows = []
    for summit in summits:
        fc, row = build_cell(summit, names, lats, lons, elevs)
        rows.append(row)
        if fc:
            path = OUTPUT / f"{summit['id']}.json"
            path.write_text(json.dumps(fc, separators=(",", ":")))
            print(
                f"{summit['id']:>18}: iso {row['computed_iso']:>8} km "
                f"(wiki {row['wiki_iso']}), {row['contributing']} contributing, "
                f"NHN {row['computed_nhn']} {' '.join(row['flags'])}"
            )
        else:
            print(f"{summit['id']:>18}: skipped — {'; '.join(row['flags'])}")

    aconcagua = next(r for r in rows if r["id"] == "aconcagua")
    assert abs(aconcagua["computed_iso"] - 16520) / 16520 <= 0.05, (
        f"Aconcagua sanity check failed: {aconcagua['computed_iso']} km"
    )

    report = [
        "# Dominance cell build report",
        "",
        "| Summit | Wiki iso (km) | Computed iso (km) | Wiki NHN | Computed nearest higher | Contributing | Flags |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        report.append(
            f"| {r['name']} | {r['wiki_iso'] or '—'} | {r['computed_iso'] or '—'} "
            f"| {r['wiki_nhn'] or '—'} | {r['computed_nhn'] or '—'} "
            f"| {r['contributing']} | {'; '.join(r['flags']) or '—'} |"
        )
    (SCRIPTS / "cell-report.md").write_text("\n".join(report) + "\n")
    print(f"\nwrote {sum(1 for r in rows if r['computed_iso'])} cell files and scripts/cell-report.md")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the full build (network + ~5–15 min compute)**

```bash
node scripts/export-summits.mjs
scripts/.venv/bin/python scripts/build_cells.py
```

Expected: download message on first run, then one progress line per summit (Everest and possibly none else skipped), no assertion failures, ending with `wrote 39 cell files and scripts/cell-report.md`. Joe's Hill is the slowest summit (most higher peaks — nearly the whole catalogue).

**If a summit trips the SUSPICIOUS flag or an assertion** (a duplicate GeoNames entry for the summit itself, more than 2 km from our coordinates): add e.g. `"denali": 10.0` to `EXTRA_EXCLUSION_KM`, rerun, and record the exclusion in the report commit message. Do not widen past 25 km without flagging it to Brendon.

- [ ] **Step 3: Spot-check one cell file**

```bash
scripts/.venv/bin/python - <<'EOF'
import json
fc = json.load(open("public/data/cells/kilimanjaro.json"))
poly = fc["features"][0]
points = fc["features"][1:]
assert poly["geometry"]["type"] in ("Polygon", "MultiPolygon")
assert poly["properties"]["contributingPeakCount"] == len(points) > 0
print("kilimanjaro:", poly["properties"]["computedIsolationKm"], "km,",
      len(points), "contributing peaks, nearest:", poly["properties"]["nearestHigherName"])
EOF
ls public/data/cells | wc -l
```

Expected: a sane isolation (Wikipedia says 5,510 km; expect within ~10%) and `39` files.

- [ ] **Step 4: Review `scripts/cell-report.md`**

Read the table. WARN rows are expected for low summits (Joe's Hill, Green Mountain, Olavtoppen, Mascarin) and anywhere GeoNames disagrees with Wikipedia — note them, don't fix them. Anything SUSPICIOUS must be resolved via `EXTRA_EXCLUSION_KM` before committing.

- [ ] **Step 5: Commit generated data**

```bash
git add scripts/build_cells.py public/data/cells scripts/cell-report.md
git commit -m "Generate dominance cells for 39 summits from GeoNames

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Front-end — remove circles, render cells

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `public/data/cells/<id>.json` (Task 6 format).
- Produces: `window.__bigfish = { map, selectSummit }` (consumed by the Task 8 smoke test); map sources `voronoi-cell`, `cell-peaks`; DOM element `#summit-computed`.

- [ ] **Step 1: Remove the isolation-circle layer from `src/main.js`**

Delete these exact pieces:

1. The line `const circleCollection = collection([]);`
2. In the `map.on('load', ...)` handler: `map.addSource('isolation-circles', { type: 'geojson', data: circleCollection });` and the two layers `isolation-fill` and `isolation-outline`.
3. In `updateSelectedOverlays`: the `circleFeature` const and the `map.getSource('isolation-circles')?.setData(...)` line.
4. In `resetInfoPanel`: the line `map.getSource('isolation-circles')?.setData(collection([]));`
5. The entire `function circle(center, radiusKm, steps = 192) { ... }`.

- [ ] **Step 2: Add cell fetching and sources to `src/main.js`**

Insert after the `arcCollection` declaration (module scope):

```js
const cellCache = new Map();
let overlayRequestToken = 0;

async function fetchCell(summitId) {
  if (summitId === 'everest') return null;
  if (!cellCache.has(summitId)) {
    const request = (async () => {
      // Production serves public/* at the site root; the dev server serves the repo root.
      for (const base of ['/data/cells', '/public/data/cells']) {
        const response = await fetch(`${base}/${summitId}.json`).catch(() => null);
        if (response?.ok) return response.json();
      }
      throw new Error(`No cell data for ${summitId}`);
    })().catch((error) => {
      console.warn(error);
      cellCache.delete(summitId);
      return null;
    });
    cellCache.set(summitId, request);
  }
  return cellCache.get(summitId);
}
```

In the `map.on('load', ...)` handler, where the isolation source/layers were (keep this *before* the `summit-arcs` layer so arcs draw on top):

```js
map.addSource('voronoi-cell', { type: 'geojson', data: collection([]) });
map.addSource('cell-peaks', { type: 'geojson', data: collection([]) });
map.addLayer({ id: 'voronoi-fill', type: 'fill', source: 'voronoi-cell', paint: { 'fill-color': '#48b8ff', 'fill-opacity': 0.08 } });
map.addLayer({ id: 'voronoi-outline', type: 'line', source: 'voronoi-cell', paint: { 'line-color': '#48b8ff', 'line-width': 1.4, 'line-opacity': 0.85 } });
```

Immediately after the existing `nhn-points` layer:

```js
map.addLayer({ id: 'cell-peaks', type: 'circle', source: 'cell-peaks', paint: { 'circle-color': '#ffb703', 'circle-radius': 4, 'circle-stroke-color': '#3a2500', 'circle-stroke-width': 1 } });
map.addLayer({ id: 'cell-peak-labels', type: 'symbol', source: 'cell-peaks', layout: { 'text-field': ['concat', ['get', 'name'], ' · ', ['to-string', ['get', 'elevationM']], ' m'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#ffe0a3', 'text-halo-color': '#07111f', 'text-halo-width': 1.1 } });
```

At the end of the `map.on('load', ...)` handler (after `applyIsolationFilter();`):

```js
window.__bigfish = { map, selectSummit };
```

- [ ] **Step 3: Rewrite `updateSelectedOverlays` and update its neighbours**

Replace the whole function with:

```js
async function updateSelectedOverlays(summit) {
  const arcFeature = summit.nhnCoordinates
    ? lineString(greatCircle(summit.coordinates, summit.nhnCoordinates), { summitId: summit.id, name: `${summit.name} → ${summit.nhn}` })
    : null;
  map.getSource('summit-arcs')?.setData(collection(arcFeature ? [arcFeature] : []));

  const token = ++overlayRequestToken;
  const cell = await fetchCell(summit.id);
  if (token !== overlayRequestToken) return;
  const polygons = cell?.features.filter((feature) => feature.geometry.type !== 'Point') ?? [];
  const peaks = cell?.features.filter((feature) => feature.geometry.type === 'Point') ?? [];
  map.getSource('voronoi-cell')?.setData(collection(polygons));
  map.getSource('cell-peaks')?.setData(collection(peaks));
  const computed = document.querySelector('#summit-computed');
  if (polygons.length) {
    const properties = polygons[0].properties;
    computed.textContent = `${Math.round(properties.computedIsolationKm).toLocaleString()} km · ${properties.contributingPeakCount} shaping peaks`;
  } else {
    computed.textContent = summit.id === 'everest' ? 'No cell — nothing higher' : 'Unavailable';
  }
}
```

In `getPrioritizedInteractiveFeature`, change both occurrences of `'isolation-fill'` to `'voronoi-fill'`.

In `resetInfoPanel`, where the old isolation-circles clear was, add:

```js
map.getSource('voronoi-cell')?.setData(collection([]));
map.getSource('cell-peaks')?.setData(collection([]));
document.querySelector('#summit-computed').textContent = '—';
```

- [ ] **Step 4: Update `index.html` and `src/styles.css`**

In `index.html`, after the `<div><dt>Isolation</dt>...</div>` line add:

```html
<div><dt>Computed isolation</dt><dd id="summit-computed">—</dd></div>
```

After the `<p id="summit-notes">...</p>` line add:

```html
<p class="data-note">Dominance cells are derived from GeoNames catalogued peaks; coverage is thinnest near sea level.</p>
```

Update the two isolation-circle wordings: hero paragraph → `Explore high-prominence summits, their nearest higher neighbours, and the dominance cells that hem them in.`; default `#summit-notes` text → `Click a peak marker or dominance cell to inspect map-native feature data.`

In `src/styles.css`, after the `#summit-notes` rule add:

```css
.data-note { margin: .5rem 0 0; color: #7f93a8; font-size: .75rem; line-height: 1.4; }
```

- [ ] **Step 5: Syntax check and static-build guard**

```bash
node --check src/main.js
npm run build
```

Expected: no syntax errors; build prints `Static site files and MapLibre configuration validated in dist.` (the build script greps `src/main.js` for MapLibre markers — all survive these edits). Verify cells shipped: `ls dist/data/cells | wc -l` → `39`.

- [ ] **Step 6: Commit**

```bash
git add src/main.js index.html src/styles.css
git commit -m "Replace isolation circles with dominance-cell layer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Playwright smoke test

**Files:**
- Modify: `package.json`
- Create: `scripts/smoke-cells.mjs`

**Interfaces:**
- Consumes: `window.__bigfish = { map, selectSummit }` (Task 7), cell files (Task 6), dev server semantics (`python3 -m http.server` from repo root — hence the `/public/data/cells` fetch fallback).

- [ ] **Step 1: Add Playwright as a dev dependency (match the globally-cached browser version)**

```bash
npm install --save-dev playwright@1.61.1
npx playwright install chromium
```

(The second command is a no-op if the browser is already in `~/Library/Caches/ms-playwright`.)

Add to `package.json` scripts: `"smoke": "node scripts/smoke-cells.mjs"`.

- [ ] **Step 2: Write `scripts/smoke-cells.mjs`**

```js
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = fileURLToPath(new URL('./.cache', import.meta.url));
mkdirSync(cacheDir, { recursive: true });
const PORT = 5199;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
let browser;

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
      break;
    } catch (error) {
      if (attempt >= 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  await page.waitForFunction(() => window.__bigfish?.map?.isStyleLoaded?.(), null, { timeout: 30000 });

  await page.evaluate(() => window.__bigfish.selectSummit('kilimanjaro'));
  await page.waitForFunction(
    () => (window.__bigfish.map.getSource('voronoi-cell')?._data?.features?.length ?? 0) > 0,
    null, { timeout: 15000 },
  );
  const peakCount = await page.evaluate(() => window.__bigfish.map.getSource('cell-peaks')._data.features.length);
  if (peakCount < 1) throw new Error('expected contributing peaks for Kilimanjaro');
  const computedText = await page.textContent('#summit-computed');
  if (!/km/.test(computedText)) throw new Error(`unexpected computed isolation text: ${computedText}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${cacheDir}/smoke-kilimanjaro.png` });

  await page.evaluate(() => window.__bigfish.selectSummit('everest'));
  await page.waitForFunction(
    () => document.querySelector('#summit-computed').textContent.includes('No cell'),
    null, { timeout: 15000 },
  );
  const cellCount = await page.evaluate(() => window.__bigfish.map.getSource('voronoi-cell')._data.features.length);
  if (cellCount !== 0) throw new Error('expected empty cell source for Everest');

  console.log('SMOKE PASS');
} finally {
  await browser?.close();
  server.kill();
}
```

- [ ] **Step 3: Run it**

Run: `npm run smoke`
Expected: `SMOKE PASS`. Then open `scripts/.cache/smoke-kilimanjaro.png` and eyeball: blue cell polygon over Africa/Indian Ocean, amber contributing-peak markers, yellow arc ending on the cell boundary.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/smoke-cells.mjs
git commit -m "Add Playwright smoke test for dominance cells

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the feature and the regeneration workflow**

Add a `## Dominance cells` section to `README.md` after "Coordinate data":

```markdown
## Dominance cells

Clicking a summit shows its dominance cell: the doubled spherical-Voronoi
polygon whose boundary passes through the higher peaks that hem the summit
in. The cell's minimum boundary distance is the summit's isolation, and the
boundary touches the nearest higher neighbour. Cells are precomputed from
the GeoNames catalogue (peaks/mountains/volcanoes/hills with elevations) —
coverage is thinnest near sea level, so low summits' cells reflect the
nearest higher *catalogued* peak. See
`docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md`.

To regenerate `public/data/cells/` (one-time ~400 MB GeoNames download,
cached in `scripts/.cache/`):

    /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv scripts/.venv
    scripts/.venv/bin/pip install numpy shapely antimeridian pytest
    node scripts/export-summits.mjs
    scripts/.venv/bin/python scripts/build_cells.py

Validation report: `scripts/cell-report.md`. Tests:
`scripts/.venv/bin/pytest scripts/ -q` and `npm run smoke`.
```

- [ ] **Step 2: Full verification pass**

```bash
scripts/.venv/bin/pytest scripts/ -q     # expect: 14 passed
node --check src/main.js
npm run build                            # expect: validation message, dist/data/cells present
npm run smoke                            # expect: SMOKE PASS
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document dominance-cell layer and regeneration workflow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
