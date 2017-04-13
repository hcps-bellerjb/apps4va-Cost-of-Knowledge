import * as tokens from './tokens';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';

mapboxgl.accessToken = tokens.mapbox;

let map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/sevaric/cj1eip4bc002n2rtcu9xo1j35',
  center: [-79.5, 38],
  zoom: 5,
  interactive: false,
  attributionControl: false
}).addControl(new mapboxgl.AttributionControl({
  compact: true
})).on('load', () => {
  resetBounds(map);
});

console.log(map.getLayer());

let resetBounds = (target) => {
  // Zoom to VA
  target.fitBounds([
    [-83.675415,
      36.5407589
    ],
    [-75.1664349,
      39.466012
    ]
  ], {
    padding: 50
  });
};

// If and what county is focussed in on
let focus = false;

// Tooltip for Names
map.on('mousemove', (e) => {
  var county = map.queryRenderedFeatures(e.point, {
    layers: ['va-countiesgeojson']
  });
  if (county.length > 0 && focus === false) {
    //console.log(county[0]);
    // Fill Data
  } else {
    // Add Invis Class
  }
});

let findBounds = (feature) => {
  let geometry = feature.geometry.coordinates;
  let outerBounds = geometry.reduce((outerBounds, coordinates) => {
    let bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[1]));
    return outerBounds.extend(bounds);
  }, new mapboxgl.LngLatBounds());
  return outerBounds;
};

let focusIn = (map, target) => {
  focus = true;
  map.fitBounds(findBounds(target), {
    padding: 50
  });
};

let focusOut = (map) => {
  focus = false;
  resetBounds(map);
};

// Zoom in and out on map
map.on('click', 'va-countiesgeojson', (e) => {
  var county = map.queryRenderedFeatures(e.point, {
    layers: ['va-countiesgeojson']
  });
  if (county.length > 0 && focus === false) {
    focusIn(map, county[0]);
  } else {
    focusOut(map);
  }
});
