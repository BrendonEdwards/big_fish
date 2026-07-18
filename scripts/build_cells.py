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
