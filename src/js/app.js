import * as tokens from './tokens';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';

mapboxgl.accessToken = tokens.mapbox;

// GLOBALS
let overlay = document.querySelector('.map-overlay>section#baseline');
let focus = false;

// MAP
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

  console.log(map.getZoom());
  console.log(map.getCenter());

  // Tooltip for Names
  map.on('mousemove', 'va-countiesgeojson', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    let county = e.features;
    if (county.length > 0 && focus === false) {
      overlay.innerHTML = '';
      let title = document.createElement('h2');
      title.textContent = county.properties.NAME10;
      let info = document.createElement('p');
      info.textContent = "TEST_VAL";
      overlay.appendChild(title)
        .appendChild(info);
      overlay.style.display = 'block';
    } else if (focus === true) {
      overlay.style.display = 'none';
    }
  });

  map.on('mouseleave', 'va-countiesgeojson', (e) => {
    map.getCanvas().style.cursor = '';
    overlay.style.display = 'none';
  });

  // Zoom in and out on map
  map.on('click', 'va-countiesgeojson', (e) => {
    let county = e.features;
    if (county.length > 0 && focus === false) {
      focus = true;
      zoomToFeature(county, map);
    } else {
      focus = false;
      resetBounds(map);
    }
  });
});

// FUNCTIONS
let zoomToFeature = (target, map) => {
  map.fitBounds(queryBounds(target), {
    padding: 50
  });
};

let queryBounds = (feature) => {
  let bounds = feature.reduce((bounds, item) => {
    let geometry = item.geometry.coordinates;
    let outerBounds = geometry.reduce((outerBounds, coordinates) => {
      return outerBounds.extend(findBounds(coordinates));
    }, new mapboxgl.LngLatBounds());
    return bounds.extend(outerBounds);
  });
  return bounds;
};

let findBounds = (geometry) => {
  let bounds = geometry.reduce((bounds, coordinates) => {
    return bounds.extend(coordinates);
  }, new mapboxgl.LngLatBounds());
  return bounds;
};

// INIT VALUES
const Virginia = map.queryRenderedFeatures({
  layers: ['va-countiesgeojson']
});

let resetBounds = (map) => {
  zoomToFeature(Virginia, map);
};
