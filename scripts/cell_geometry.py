"""Spherical geometry for dominance cells (doubled Voronoi cells).

All angles internal to this module are radians; public inputs/outputs use
degrees for coordinates, radians for distances/bearings unless noted.
"""
import numpy as np
import antimeridian
from shapely.geometry import Polygon, box, mapping
from pyproj import Geod

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
        # mod pi is defensive only: arctan2 with positive tan_half already lands in (0, pi).
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
    rectangle minus the complement blob. The ring (a closed boundary that is
    star-shaped about the summit) also bounds the excluded blob around the
    summit's antipode as-is; fix_polygon normalizes winding itself, so no
    explicit reversal of the coordinates is needed here.
    """
    coords = list(zip(lons.tolist(), lats.tolist()))
    coords.append(coords[0])
    if north_pole and south_pole:
        blob = antimeridian.fix_polygon(Polygon(coords))
        return mapping(box(-180.0, -90.0, 180.0, 90.0).difference(blob))
    return mapping(
        antimeridian.fix_polygon(
            Polygon(coords),
            force_north_pole=north_pole,
            force_south_pole=south_pole,
            fix_winding=True,
        )
    )


_GEOD = Geod(ellps="WGS84")


def _to_vector(lat, lon):
    phi, lam = np.radians(lat), np.radians(lon)
    return np.array([np.cos(phi) * np.cos(lam), np.cos(phi) * np.sin(lam), np.sin(phi)])


def geodesic_points(lat1, lon1, lat2, lon2, step_km=200.0):
    """Inclusive points along the great circle from 1 to 2, ~step_km apart."""
    v1, v2 = _to_vector(lat1, lon1), _to_vector(lat2, lon2)
    omega = np.arccos(np.clip(np.dot(v1, v2), -1.0, 1.0))
    if np.sin(omega) < 1e-12:
        return np.array([lat1, lat2]), np.array([lon1, lon2])
    count = max(2, int(np.ceil(omega * EARTH_RADIUS_KM / step_km)) + 1)
    fraction = np.linspace(0.0, 1.0, count)
    a = np.sin((1 - fraction) * omega) / np.sin(omega)
    b = np.sin(fraction * omega) / np.sin(omega)
    v = a[:, None] * v1[None, :] + b[:, None] * v2[None, :]
    lats = np.degrees(np.arctan2(v[:, 2], np.hypot(v[:, 0], v[:, 1])))
    lons = np.degrees(np.arctan2(v[:, 1], v[:, 0]))
    return lats, lons


def _ring_winding(ring_lons):
    """Net revolutions of a closed ring's longitudes around the polar axis:
    +/-1 means the ring encloses exactly one pole, 0 means none."""
    deltas = np.diff(np.asarray(ring_lons))
    deltas = (deltas + 180.0) % 360.0 - 180.0
    return int(round(deltas.sum() / 360.0))


def jailer_ring(hub_lat, hub_lon, jailer_lats, jailer_lons, jailer_bearings_deg, jailer_dists_km, step_km=200.0):
    """Ring-of-jailers polygon: jailer vertices in bearing order, densified
    geodesic edges, antimeridian/pole-safe. Returns (geojson geometry dict,
    area_km2) or (None, None) when fewer than 3 jailers."""
    if len(jailer_lats) < 3:
        return None, None
    order = np.argsort(jailer_bearings_deg)
    lats = np.asarray(jailer_lats)[order]
    lons = np.asarray(jailer_lons)[order]
    ring_lats, ring_lons = [], []
    for i in range(len(lats)):
        j = (i + 1) % len(lats)
        seg_lats, seg_lons = geodesic_points(lats[i], lons[i], lats[j], lons[j], step_km)
        ring_lats.extend(seg_lats[:-1])
        ring_lons.extend(seg_lons[:-1])
    ring_lats.append(ring_lats[0])
    ring_lons.append(ring_lons[0])
    winding = _ring_winding(ring_lons)
    assert abs(winding) <= 1, "simple jailer ring cannot wind more than once"
    north = winding != 0 and float(np.mean(ring_lats)) > 0
    south = winding != 0 and not north
    coords = [(round(lon, 3), round(lat, 3)) for lon, lat in zip(ring_lons, ring_lats)]
    fixed = antimeridian.fix_polygon(
        Polygon(coords), fix_winding=True, force_north_pole=north, force_south_pole=south
    )
    area_m2, _ = _GEOD.geometry_area_perimeter(fixed)
    return mapping(fixed), abs(area_m2) / 1e6
