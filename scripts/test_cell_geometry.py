import numpy as np
from shapely.geometry import Point, shape

from cell_geometry import angular_distance_and_bearing, destination, CAP_DEGREES, boundary_distances, cell_ring, poles_inside, ring_to_geojson_geometry


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

    # The single-peak case above happens to produce zero raw duplicates, so
    # it wouldn't fail if the dedup mask were deleted. Force a genuine
    # collision: 1440 points all within ~0.005 degrees of the antipode round
    # to far fewer distinct 3-decimal coordinates.
    theta_dense = np.linspace(0, 2 * np.pi, 1440, endpoint=False)
    R_dense = np.full(1440, np.radians(179.995))
    lats2, lons2 = cell_ring(0.0, 0.0, theta_dense, R_dense)
    pairs2 = list(zip(lats2.tolist(), lons2.tolist()))
    assert all(a != b for a, b in zip(pairs2, pairs2[1:]))
    assert len(lats2) < len(theta_dense)


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


import pytest

from cell_geometry import angular_distance_and_bearing, geodesic_points, jailer_ring


def test_geodesic_points_endpoints_and_spacing():
    lats, lons = geodesic_points(0.0, 0.0, 0.0, 90.0, step_km=500.0)
    assert (lats[0], lons[0]) == (0.0, 0.0)
    assert np.isclose(lats[-1], 0.0) and np.isclose(lons[-1], 90.0)
    assert len(lats) >= 21  # ~10,000 km / 500 km
    gaps = np.abs(np.diff(lons))
    assert gaps.max() < 5.1  # roughly uniform spacing along the equator


def _square_jailers():
    # four jailers 10 deg from (0, 0) at the cardinal bearings
    lats = np.array([10.0, 0.0, -10.0, 0.0])
    lons = np.array([0.0, 10.0, 0.0, -10.0])
    bearings = np.array([0.0, 90.0, 180.0, 270.0])
    dists = np.full(4, np.radians(10.0)) * 6371.0088
    return lats, lons, bearings, dists


def test_jailer_ring_square():
    from shapely.geometry import Point, shape

    geometry, area = jailer_ring(0.0, 0.0, *_square_jailers())
    geom = shape(geometry)
    assert geom.is_valid
    assert geom.contains(Point(0.0, 0.0))          # hub inside
    assert not geom.contains(Point(15.0, 15.0))    # corner-ward point outside
    # spherical diamond, "radius" ~1,111 km: planar estimate 2r^2 ~ 2.47M km2
    assert 2.0e6 < area < 3.2e6


def test_jailer_ring_needs_three_vertices():
    lats, lons, bearings, dists = _square_jailers()
    geometry, area = jailer_ring(0.0, 0.0, lats[:2], lons[:2], bearings[:2], dists[:2])
    assert geometry is None and area is None


def test_jailer_ring_antimeridian():
    from shapely.geometry import shape

    lats = np.array([10.0, 0.0, -10.0, 0.0])
    lons = np.array([179.5, -170.5, 179.5, 169.5])
    bearings = np.array([0.0, 90.0, 180.0, 270.0])
    dists = np.full(4, np.radians(10.0)) * 6371.0088
    geometry, area = jailer_ring(0.0, 179.5, lats, lons, bearings, dists)
    geom = shape(geometry)
    assert geometry["type"] == "MultiPolygon" and geom.is_valid
    assert geom.bounds[0] >= -180 and geom.bounds[2] <= 180
    assert 2.0e6 < area < 3.2e6


def test_jailer_ring_containing_south_pole():
    from shapely.geometry import shape

    # hub near the south pole, jailers 10 deg away all around
    lats = np.array([-75.0, -85.0, -85.0, -75.0])
    lons = np.array([0.0, 90.0, -90.0, 180.0])
    bearings = np.array([0.0, 90.0, 270.0, 180.0])
    dists = np.full(4, np.radians(10.0)) * 6371.0088
    geometry, area = jailer_ring(-85.0, 0.0, lats, lons, bearings, dists)
    geom = shape(geometry)
    assert geom.is_valid
    assert geom.bounds[1] <= -89.9  # ring closed through the pole
    assert area > 1.5e6


def test_jailer_ring_narrow_cluster_far_side():
    from shapely.geometry import Point, shape

    # Aconcagua-like: every jailer in a narrow bearing arc on the far side of
    # the planet — the "ring" is a blob over the cluster, not a hub loop.
    hub_lat, hub_lon = -32.65, -70.01
    lats = np.array([30.0, 35.0, 28.0, 36.0])
    lons = np.array([75.0, 82.0, 88.0, 95.0])
    d, alpha = angular_distance_and_bearing(hub_lat, hub_lon, lats, lons)
    geometry, area = jailer_ring(
        hub_lat, hub_lon, lats, lons, np.degrees(alpha), d * 6371.0088
    )
    geom = shape(geometry)
    assert geom.is_valid
    assert geom.contains(Point(83.0, 32.0))
    assert not geom.contains(Point(-70.01, -32.65))
    assert area < 5.0e6
