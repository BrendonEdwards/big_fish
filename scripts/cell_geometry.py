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
