"""Spherical geometry for dominance cells (doubled Voronoi cells).

All angles internal to this module are radians; public inputs/outputs use
degrees for coordinates, radians for distances/bearings unless noted.
"""
import numpy as np
import antimeridian
from shapely.geometry import Polygon, box, mapping

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


def build_star_geometry(hub_lat, hub_lon, theta, R):
    """Valid GeoJSON geometry for a star-shaped region about (hub_lat, hub_lon)
    with boundary angular distance R(theta) in radians. Handles the single-pole
    and both-poles (world-with-hole) cases. Returns a GeoJSON geometry dict."""
    lats, lons = cell_ring(hub_lat, hub_lon, theta, R)
    north, south = poles_inside(hub_lat, np.mod(theta, 2 * np.pi), R)
    if north and south:
        span = float(np.max(lons) - np.min(lons))
        assert span < 350.0, "antipodal blob crossing the antimeridian is not supported"
        hole = list(zip(lons.tolist(), lats.tolist()))
        hole.append(hole[0])
        shell = [(-180.0, -90.0), (180.0, -90.0), (180.0, 90.0), (-180.0, 90.0), (-180.0, -90.0)]
        geometry = mapping(Polygon(shell, holes=[hole]))
    else:
        geometry = ring_to_geojson_geometry(lats, lons, north, south)
    from shapely.geometry import shape
    assert shape(geometry).is_valid, "star geometry must be a valid polygon"
    return geometry


def _densified_world():
    """World rectangle with subdivided edges so the globe tessellates the
    large complement fill smoothly."""
    step = 4.0
    lons = list(np.arange(-180.0, 180.0, step)) + [180.0]
    lats = list(np.arange(-90.0, 90.0, step)) + [90.0]
    ring = ([(lon, -90.0) for lon in lons]
            + [(180.0, lat) for lat in lats]
            + [(lon, 90.0) for lon in reversed(lons)]
            + [(-180.0, lat) for lat in reversed(lats)])
    return Polygon(ring)


def dominance_complement(ring_geometry):
    """GeoJSON geometry of everything OUTSIDE the dominance ring: the world
    minus the ring. Uses a boolean difference on the already-valid,
    antimeridian-fixed ring geometry, so every antimeridian/pole case is
    handled by shapely. Returns a GeoJSON geometry dict, or None if empty."""
    from shapely.geometry import shape
    comp = _densified_world().difference(shape(ring_geometry))
    if comp.is_empty:
        return None
    assert comp.is_valid, "dominance complement must be a valid polygon"
    return mapping(comp)


def jailer_ring(hub_lat, hub_lon, jailer_lats, jailer_lons, jailer_bearings_deg, jailer_dists_km, step_deg=0.5):
    """Ring-of-jailers polygon: jailer vertices in bearing order, edges swept
    by interpolating bearing and distance from the hub (star-shaped by
    construction, so the ring can never self-intersect; the boundary between
    two jailers never dips below the nearer one's distance, so min boundary
    distance stays >= the isolation, touching it at the NHN vertex).
    Returns (geojson geometry dict, area_km2, dim_geometry dict) or
    (None, None, None) for < 3 jailers."""
    if len(jailer_lats) < 3:
        return None, None, None
    order = np.argsort(jailer_bearings_deg)
    bearings = np.asarray(jailer_bearings_deg, dtype=float)[order]
    dists = np.asarray(jailer_dists_km, dtype=float)[order] / EARTH_RADIUS_KM
    theta_parts, r_parts = [], []
    n = len(bearings)
    for i in range(n):
        j = (i + 1) % n
        gap = (bearings[j] - bearings[i]) % 360.0
        if gap == 0.0:
            # Exact tie (two jailers at the same bearing, different
            # distances): a legitimate radial jump, not a sweep to fill.
            # Emit a single zero-width sample; the next segment starts the
            # sweep onward from bearings[j] == bearings[i].
            theta_parts.append(np.radians([bearings[i]]))
            r_parts.append(np.asarray([dists[i]]))
            continue
        steps = max(1, int(np.ceil(gap / step_deg)))
        t = np.arange(steps) / steps
        theta_parts.append(np.radians(bearings[i] + gap * t))
        r_parts.append(dists[i] * (1 - t) + dists[j] * t)
    theta = np.concatenate(theta_parts)
    R = np.concatenate(r_parts)
    # Spherical integral (piecewise-linear radius profile sampled at 0.5°; sub-0.1% accuracy)
    # of the hub-side region of a star-shaped ring:
    # A = R_earth^2 * integral over theta of (1 - cos R(theta)) dtheta.
    # Uniform for every case — normal rings, pole-containing rings, and the
    # both-poles world-with-hole case — with no geodesic-library edge cases.
    dtheta = np.diff(np.concatenate([theta, [theta[0] + 2.0 * np.pi]]))
    # A zero-width step at a tied bearing (see gap == 0.0 above) is a
    # legitimate radial jump — its area contribution is 0 either way — so
    # the sweep only needs to be non-decreasing, not strictly increasing;
    # the closing wrap still guarantees the full 360-degree sweep.
    assert np.all(dtheta >= 0), "ring bearing sweep must be non-decreasing"
    area_km2 = float(EARTH_RADIUS_KM ** 2 * np.sum((1.0 - np.cos(R)) * dtheta))
    ring_geometry = build_star_geometry(hub_lat, hub_lon, theta, R)
    dim_geometry = dominance_complement(ring_geometry)
    return ring_geometry, area_km2, dim_geometry
