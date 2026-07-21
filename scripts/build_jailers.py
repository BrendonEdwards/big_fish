#!/usr/bin/env python3
"""Build jailer spokes/ring data (jailers.json) for every summit in the app.

Run offline by a developer (never by CI):

    node scripts/export-summits.mjs
    scripts/.venv/bin/python scripts/build_jailers.py

Downloads and caches the GeoNames allCountries dump (~400 MB, first run
only), then writes public/data/jailers.json (per-summit jailer entries)
plus a validation report at scripts/jailers-report.md.
"""
import io
import json
import urllib.request
import zipfile
from pathlib import Path

import numpy as np

SCRIPTS = Path(__file__).resolve().parent
CACHE = SCRIPTS / ".cache"
GEONAMES_URL = "https://download.geonames.org/export/dump/allCountries.zip"
FEATURE_CODES = {"PK", "PKS", "MT", "VLC", "HLL"}
SELF_EXCLUSION_KM = 2.0
# Widen the exclusion radius for a summit id if cell-report.md flags a
# suspicious (< 50 km) computed isolation caused by a duplicate or
# mis-located catalogue entry for the summit itself.
EXTRA_EXCLUSION_KM = {
    # GeoNames catalogues a second "Mount Paget" (MT) 2.05 km from our
    # coordinate, elev 2933 m vs. our 2915 m — a duplicate entry for the
    # same summit, not a genuine competing peak. 2.0 km default exclusion
    # doesn't clear it; 3.0 km does. Its elev-vs-dem gap (706 m) is below
    # STALE_ELEVATION_MIN_DELTA_M, so the guard below doesn't catch it.
    "paget": 3.0,
}
# Reject a candidate if its elevation column sits this far above its dem
# (SRTM) column when dem is available (> 0). Catches point features with
# bogus/stale elevations — e.g. "Cerro Pariamachay" (elev 6759 vs dem 4758,
# delta 2001 m) which collapsed Nevado Huascaran's computed isolation from
# 2196 km to 246 km. Never applied when dem is missing or <= 0 (GeoNames'
# sentinel for "no SRTM coverage", common in Antarctica — e.g. Vinson
# Massif's own dem is -9999).
STALE_ELEVATION_MIN_DELTA_M = 1000
DATASET_NOTE = (
    "Cell derived from GeoNames catalogued peaks (PK/PKS/MT/VLC/HLL); "
    "coverage is thinnest near sea level."
)


def parse_geonames_lines(lines):
    """Filter GeoNames rows to mountain-type features with a plausible elevation."""
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
        try:
            dem = int(cols[16]) if cols[16] else None
        except ValueError:
            dem = None
        if dem is not None and dem > 0 and elev - dem > STALE_ELEVATION_MIN_DELTA_M:
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
    """Download (cached, atomic) and stream-parse the GeoNames allCountries dump."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    zip_path = cache_dir / "allCountries.zip"
    if not zip_path.exists():
        print("downloading GeoNames allCountries.zip (~400 MB, one-time)...")
        part_path = zip_path.with_suffix(".zip.part")
        try:
            urllib.request.urlretrieve(GEONAMES_URL, part_path)
            part_path.rename(zip_path)
        except Exception:
            part_path.unlink(missing_ok=True)
            raise
    with zipfile.ZipFile(zip_path) as zf, zf.open("allCountries.txt") as fh:
        return parse_geonames_lines(io.TextIOWrapper(fh, encoding="utf-8"))


def build_summit_entry(summit, names, lats, lons, elevs):
    """Return (jailers.json entry | None, report_row) for one summit."""
    from cell_geometry import (
        EARTH_RADIUS_KM,
        angular_distance_and_bearing,
        boundary_distances,
        jailer_ring,
    )

    higher = elevs > summit["elevationM"]
    row = {
        "id": summit["id"],
        "name": summit["name"],
        "wiki_iso": summit["isolationKm"],
        "wiki_nhn": (summit.get("nhn") or {}).get("name"),
        "computed_iso": None,
        "computed_nhn": None,
        "jailer_count": 0,
        "ring_area_km2": None,
        "flags": [],
    }
    if not higher.any():
        row["flags"].append("global high point — no jailers")
        return None, row

    lat0, lon0 = summit["latitude"], summit["longitude"]
    d, alpha = angular_distance_and_bearing(lat0, lon0, lats[higher], lons[higher])
    exclusion = EXTRA_EXCLUSION_KM.get(summit["id"], SELF_EXCLUSION_KM) / EARTH_RADIUS_KM
    keep = d > exclusion
    d, alpha = d[keep], alpha[keep]
    names_h = names[higher][keep]
    lats_h, lons_h = lats[higher][keep], lons[higher][keep]
    elevs_h = elevs[higher][keep]
    if len(d) == 0:
        row["flags"].append("no catalogued higher peaks beyond exclusion radius")
        return None, row

    theta, R, idx = boundary_distances(d, alpha)
    contributing = np.unique(idx)
    # Order once by unrounded bearing (alpha, radians in [0, 2*pi), so sorting
    # it directly matches degree order) and reuse that ordering for both the
    # rounded display list and the ring's geometry inputs. Rounding bearings
    # to 0.1 degrees before sorting/feeding jailer_ring can manufacture exact
    # ties between distinct peaks that don't exist at full precision.
    contributing = contributing[np.argsort(alpha[contributing])]
    jailers = [
        {
            "name": str(names_h[i]),
            "elevationM": int(elevs_h[i]),
            "distanceKm": round(float(d[i]) * EARTH_RADIUS_KM, 1),
            "bearingDeg": round(float(np.degrees(alpha[i])), 1),
            "coordinates": [round(float(lons_h[i]), 4), round(float(lats_h[i]), 4)],
        }
        for i in contributing
    ]
    iso_km = round(float(d.min()) * EARTH_RADIUS_KM, 1)
    nhn = min(jailers, key=lambda j: j["distanceKm"])
    assert nhn["distanceKm"] == iso_km, summit["id"]  # nearest higher is always a jailer

    ring, area_km2, dim_region = jailer_ring(
        lat0, lon0,
        lats_h[contributing],
        lons_h[contributing],
        np.degrees(alpha[contributing]),
        d[contributing] * EARTH_RADIUS_KM,
    )
    entry = {
        "isolationKmComputed": iso_km,
        "nhn": dict(nhn),
        "jailers": jailers,
        "ring": ring,
        "ringAreaKm2": round(area_km2, 1) if area_km2 is not None else None,
        "meanSpokeKm": round(float(np.mean([j["distanceKm"] for j in jailers])), 1),
        "dimRegion": dim_region,
    }

    row["computed_iso"] = iso_km
    row["computed_nhn"] = nhn["name"]
    row["jailer_count"] = len(jailers)
    row["ring_area_km2"] = entry["ringAreaKm2"]
    if len(jailers) < 3:
        row["flags"].append("fewer than 3 jailers — no ring polygon")
    if iso_km < 50.0:
        row["flags"].append("SUSPICIOUS: computed isolation < 50 km")
    if summit["isolationKm"]:
        delta = abs(iso_km - summit["isolationKm"]) / summit["isolationKm"]
        if delta > 0.10:
            row["flags"].append(f"WARN: {delta:.0%} off Wikipedia isolation")
    return entry, row


def main():
    import datetime

    summits_path = CACHE / "summits.json"
    if not summits_path.exists():
        raise SystemExit("scripts/.cache/summits.json missing — run: node scripts/export-summits.mjs")
    summits = json.loads(summits_path.read_text())
    names, lats, lons, elevs = load_geonames(CACHE)
    print(f"{len(elevs):,} candidate peaks loaded from GeoNames")

    entries, rows = {}, []
    for summit in summits:
        entry, row = build_summit_entry(summit, names, lats, lons, elevs)
        rows.append(row)
        if entry:
            entries[summit["id"]] = entry
            print(
                f"{summit['id']:>18}: iso {row['computed_iso']:>8} km (wiki {row['wiki_iso']}), "
                f"{row['jailer_count']} jailers, ring {row['ring_area_km2']} km2 {' '.join(row['flags'])}"
            )
        else:
            print(f"{summit['id']:>18}: skipped — {'; '.join(row['flags'])}")

    aconcagua = next(r for r in rows if r["id"] == "aconcagua")
    assert abs(aconcagua["computed_iso"] - 16520) / 16520 <= 0.05, (
        f"Aconcagua sanity check failed: {aconcagua['computed_iso']} km"
    )

    out_path = SCRIPTS.parent / "public" / "data" / "jailers.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(
        {"generated": datetime.date.today().isoformat(), "datasetNote": DATASET_NOTE, "summits": entries},
        separators=(",", ":"),
    ))

    report = [
        "# Jailers build report",
        "",
        "| Summit | Wiki iso (km) | Computed iso (km) | Wiki NHN | Computed NHN | Jailers | Ring area (km2) | Flags |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        report.append(
            f"| {r['name']} | {r['wiki_iso'] or '—'} | {r['computed_iso'] or '—'} "
            f"| {r['wiki_nhn'] or '—'} | {r['computed_nhn'] or '—'} | {r['jailer_count']} "
            f"| {r['ring_area_km2'] or '—'} | {'; '.join(r['flags']) or '—'} |"
        )
    (SCRIPTS / "jailers-report.md").write_text("\n".join(report) + "\n")
    print(f"\nwrote {len(entries)} summit entries to public/data/jailers.json and scripts/jailers-report.md")


if __name__ == "__main__":
    main()
