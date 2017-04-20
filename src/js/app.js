import * as tokens from './tokens';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
import observeResize from 'simple-element-resize-detector';
import pleaseWait from 'please-wait/build/please-wait.js';
import Papa from 'papaparse';

mapboxgl.accessToken = tokens.mapbox;

// Loader
// let loader = pleaseWait.pleaseWait({
//   logo: 'img/logo.svg',
//   backgroundColor: '#FCFCFC',
//   loadingHtml: '<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
// });

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
    if (county && focus === false && map.queryRenderedFeatures({
        layers: ['va-countiesgeojson']
      }).length > 1) {
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
      overlay.parentNode.style.display = 'none';
      map.setFilter('va-countiesgeojson', ['in', 'NAME10', county[0].properties.NAME10]);
      zoomToFeature(county, map);
      focusFeature(county, map);
      searchBox.value = '';
    } else {
      map.setFilter('va-countiesgeojson', ['!=', 'NAME10', '']);
      overlay.parentNode.style.display = 'block';
      unfocus(map);
      resetBounds(map);
    }
  });

  // loader.finish();
});

// FUNCTIONS
const addClass = (element, className) => {
  if (element.classList) {
    element.classList.add(className);
  } else if (!hasClass(element, className)) {
    element.className += " " + className;
  }
};

const removeClass = (element, className) => {
  if (element.classList) {
    element.classList.remove(className);
  } else if (hasClass(element, className)) {
    let regex = new RegExp('(\\s|^)' + className + '(\\s|$)');
    element.className = element.className.replace(regex, ' ');
  }
};

const zoomToFeature = (target, map) => {
  map.fitBounds(queryBounds(target), {
    padding: 50
  });
};

let prevSearch = "";

const searchSetup = (map) => {
  const searchBox = document.getElementById('search');
  searchBox.addEventListener('keyup', (e) => {
    let value = e.target.value.trim().toLowerCase();

    // Filter visible features that don't match the input value.
    let filtered = Virginia.filter((feature) => {
      let name = feature.properties.NAMELSAD10.trim().toLowerCase();
      return name.indexOf(value) > -1;
    });

    if (filtered.length === 1 && focus === false) {
      zoomToFeature(map.queryRenderedFeatures({
        layers: ['va-countiesgeojson']
      }), map);
      focusFeature(filtered, map);
    }

    // Set the filter to populate features into the layer.
    map.setFilter('va-countiesgeojson', ['in', 'NAMELSAD10'].concat(filtered.map((feature) => {
      return feature.properties.NAMELSAD10;
    })));

    if (value.length > prevSearch.length) {
      zoomToFeature(map.queryRenderedFeatures({
        layers: ['va-countiesgeojson']
      }), map);
    } else if (prevSearch.length > value.length && focus === true) {
      unfocus(map);
    } else {
      resetBounds(map);
    }
    prevSearch = value;
  });
};

// It just works ;)
const queryBounds = (featureList) => {
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

const findBounds = (geometry) => {
  let bounds = geometry.reduce((bounds, coordinates) => {
    return bounds.extend(coordinates);
  }, new mapboxgl.LngLatBounds());
  return bounds;
};

const resetBounds = (map) => {
  zoomToFeature(Virginia, map);
};

// INIT
const mapDiv = document.getElementById('map');
const sidebar = document.getElementById('sidebar');

observeResize(mapDiv, () => {
  map.resize();
  console.log('new size: ', {
    width: mapDiv.clientWidth,
    height: mapDiv.clientHeight
  });
});

removeClass(sidebar, 'focus');
removeClass(mapDiv, 'focus');
map.resize();

// FOCUS
const focusFeature = (target, map) => {
  console.log(target[0].properties.NAME10);
  focus = true;
  addClass(sidebar, 'focus');
  addClass(mapDiv, 'focus');
};

const unfocus = (map => {
  focus = false;
  removeClass(sidebar, 'focus');
  removeClass(mapDiv, 'focus');
});
