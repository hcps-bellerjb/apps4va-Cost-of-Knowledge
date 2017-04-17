import * as tokens from './tokens';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';

mapboxgl.accessToken = tokens.mapbox;

// GLOBALS
let overlay = document.querySelector('.map-overlay>.typeset');
let focus = false;
let Virginia;

overlay.innerHTML = '<input id="search" type="text" placeholder="Search for a place..."/>';

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
  Virginia = map.queryRenderedFeatures({
    layers: ['va-countiesgeojson']
  });

  resetBounds(map);
  searchSetup(map);

  // Tooltip for Names
  map.on('mousemove', 'va-countiesgeojson', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    let county = e.features[0];
    if (county && focus === false) {
      overlay.innerHTML = '';
      let title = document.createElement('h4');
      title.textContent = county.properties.NAME10;
      let info = document.createElement('p');
      info.textContent = "TEST_VAL";
      overlay.appendChild(title);
      overlay.appendChild(info);
      overlay.parentNode.style.display = 'block';
    } else if (focus === true) {
      overlay.parentNode.style.display = 'none';
    }
  });

  map.on('mouseleave', 'va-countiesgeojson', (e) => {
    map.getCanvas().style.cursor = '';
    overlay.innerHTML = '<input id="search" type="text" placeholder="Search for a place..."/>';
    searchSetup(map);
  });

  // Zoom in and out on map
  map.on('click', 'va-countiesgeojson', (e) => {
    let county = e.features;
    if (county.length > 0 && focus === false) {
      focus = true;
      overlay.parentNode.style.display = 'none';
      zoomToFeature(county, map);
      map.setFilter('va-countiesgeojson', ['in', 'NAME10', county[0].properties.NAME10]);
    } else {
      resetBounds(map);
      map.setFilter('va-countiesgeojson', ['!=', 'NAME10', '']);
      overlay.parentNode.style.display = 'block';
      focus = false;
    }
  });
});

// FUNCTIONS
let zoomToFeature = (target, map) => {
  map.fitBounds(queryBounds(target), {
    padding: 50
  });
};

let prevSearch = "";

let searchSetup = (map) => {
  let searchBox = document.getElementById('search');
  searchBox.addEventListener('keyup', (e) => {
    var value = e.target.value.trim().toLowerCase();

    // Filter visible features that don't match the input value.
    var filtered = Virginia.filter((feature) => {
      var name = feature.properties.NAMELSAD10.trim().toLowerCase();
      return name.indexOf(value) > -1;
    });

    // Set the filter to populate features into the layer.
    map.setFilter('va-countiesgeojson', ['in', 'NAME10'].concat(filtered.map((feature) => {
      return feature.properties.NAME10;
    })));

    if (value.length > prevSearch.length) {
      zoomToFeature(map.queryRenderedFeatures({
        layers: ['va-countiesgeojson']
      }), map);
    } else {
      resetBounds(map);
    }
    prevSearch = value;
  });
};

// It just works ;)
let queryBounds = (featureList) => {
  let globalBounds = featureList.reduce((globalBounds, feature) => {
    let coordinates = feature.geometry.coordinates;
    if (feature.geometry.type === "Polygon") {
      let featureBounds = coordinates.reduce((featureBounds, shape) => {
        return featureBounds.extend(findBounds(shape));
      }, new mapboxgl.LngLatBounds());
      return globalBounds.extend(featureBounds);
    } else if (feature.geometry.type === "MultiPolygon") {
      let featureGroupBounds = coordinates.reduce((featureGroupBounds, polygon) => {
        let featureBounds = polygon.reduce((featureBounds, shape) => {
          return featureBounds.extend(findBounds(shape));
        }, new mapboxgl.LngLatBounds());
        return featureGroupBounds.extend(featureBounds);
      }, new mapboxgl.LngLatBounds());
      return globalBounds.extend(featureGroupBounds);
    } else {
      throw new Error('Unknown Geometry');
    }
  }, new mapboxgl.LngLatBounds());
  return globalBounds;
};

let findBounds = (geometry) => {
  let bounds = geometry.reduce((bounds, coordinates) => {
    return bounds.extend(coordinates);
  }, new mapboxgl.LngLatBounds());
  return bounds;
};

let resetBounds = (map) => {
  zoomToFeature(Virginia, map);
};
