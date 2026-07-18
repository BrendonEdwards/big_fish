import numpy as np

from cell_geometry import angular_distance_and_bearing, destination, CAP_DEGREES, boundary_distances


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
