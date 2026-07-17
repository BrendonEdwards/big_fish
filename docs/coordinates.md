# Coordinate research

The app now maps the first 40 ranked summits from the Wikipedia-derived highest-mountains table instead of the earlier seven-summit sample. Source latitude/longitude values are stored in `src/main.js` as WGS84 decimal degrees and converted to GeoJSON `[longitude, latitude]` arrays through `location(latitude, longitude)`.

The table data was cross-checked against public coordinate listings while entering the points manually. The build script also fails if fewer than 40 peak records are present.

Primary list source: <https://en.wikipedia.org/wiki/List_of_highest_mountains_on_Earth>

Additional coordinate cross-check sources used for spot checks include Wikipedia mountain pages, Peakbagger, LatLong.net, Coordinates Converter, and Google Maps coordinate links where a mountain page did not expose decimal WGS84 coordinates directly.
