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
