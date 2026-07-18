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


# Areal range/group centroid (MTS) with an otherwise-valid elevation, a
# feature-coded PK point with a stale/bogus elevation far above its dem
# (the Sentinel Range / Alborz Mountains defect pattern that collapsed
# Vinson's and Elbrus's computed isolation), and a real Antarctic PK point
# with no SRTM coverage (dem sentinel -9999) that the stale-elevation guard
# must not reject.
STALE_AND_AREAL_FIXTURE = [
    "7\tRamapo Mountains\tRamapo Mountains\t\t41.0\t-74.3\tT\tMTS\tUS\t\t\t\t\t\t0\t500\t495\tAmerica/New_York\t2024-01-01",
    "8\tSentinel Range\tSentinel Range\t\t-78.16667\t-85.5\tT\tPK\tAQ\t\t\t\t\t\t0\t5140\t1485\tAntarctica/Casey\t2024-01-01",
    "9\tVinson Massif\tVinson Massif\t\t-78.525483\t-85.617147\tT\tPK\tAQ\t\t\t\t\t\t0\t4892\t-9999\tAntarctica/Casey\t2024-01-01",
]


def test_parse_geonames_drops_areal_ranges_and_stale_elevations_but_keeps_missing_dem():
    names, lats, lons, elevs = parse_geonames_lines(STALE_AND_AREAL_FIXTURE)
    assert names.tolist() == ["Vinson Massif"]
    assert lats.tolist() == [-78.525483]
    assert lons.tolist() == [-85.617147]
    assert elevs.tolist() == [4892]
