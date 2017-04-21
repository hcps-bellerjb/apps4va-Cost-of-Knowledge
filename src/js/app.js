import * as tokens from './tokens';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
import observeResize from 'simple-element-resize-detector';
import pleaseWait from 'please-wait/build/please-wait.js';
import Papa from 'papaparse';
import tinycolor from 'tinycolor2';
import tinygradient from 'tinygradient';
import Chart from 'chart.js';

mapboxgl.accessToken = tokens.mapbox;

// Loader
// let loader = pleaseWait.pleaseWait({
//   logo: 'img/logo.svg',
//   backgroundColor: '#FCFCFC',
//   loadingHtml: '<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
// });

// GLOBALS
var overlay = document.querySelector('#omnibox>.typeset'), focus = false, Virginia;

overlay.innerHTML = '<input id="search" type="text" placeholder="Search for a place..."/>';

// DATA
var finance, sol;
var year = '2014';

const gradientResolution = 30;

var performance, stops = new Array(gradientResolution);
var colors = tinygradient(['#f44336','#ffeb3b','#4caf50']).hsv(gradientResolution, 'short').map((color) => {return color.toHexString();});

Papa.parse('data/finance.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: (resultFin) => {
    finance = resultFin.data;
    Papa.parse('data/sol.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (resultSOL) => {
        sol = resultSOL.data;
        populatePerformance(finance, sol);
        calculateStops(performance);
      }
    });
  }
});

var populatePerformance = (finance, sol) => {
  if (finance.length === sol.length) {

    var performanceArray = new Array(sol.length);

    for (var i = 0; i < finance.length; i++) {
      var AVGSOL = (sol[i][`history_${year}`] + sol[i][`math_${year}`] + sol[i][`reading_${year}`] + sol[i][`science_${year}`] + sol[i][`writing_${year}`]) / 5;
      performanceArray[i] = AVGSOL / finance[i][`total_${year}`];
    }

    performance = performanceArray;
  } else {
    throw new Error("This is VERY wrong...");
  }
};

var calculateStops = (performance) => {
  var stepSize = performance.length / gradientResolution;
  let performanceS = performance.slice().sort();
  for (var i = 0; i < gradientResolution; i++) {
    stops[i] = performanceS[Math.round(stepSize * i)];
  }
};

var drawChoropleth = (map, performance, stops, state) => {
  for (var i = 0; i < gradientResolution; i++) {
    var layerFeatures = state.filter((elem, index, arr) => {
      var elemPerformance = performance[
        sol.findIndex((e) => {
          return (e.name.toLowerCase() === elem.properties.NAMELSAD10.toLowerCase());
        })
      ];
      if (i === gradientResolution - 1) {
        return (elemPerformance >= stops[i]);
      } else {
        return (elemPerformance >= stops[i] && elemPerformance < stops[i+1]);
      }
    });

    map.addLayer({
      "id": `choropleth${i}`,
      "type": "fill",
      "source": "counties",
      "source-layer": "va_countiesgeojson",
      "paint": {
        "fill-color": `${colors[i]}`
      },
      "filter": ['in', 'NAMELSAD10'].concat(layerFeatures.map((e) => {
      return e.properties.NAMELSAD10;
    }))
    }, 'va-countiesgeojson');
  }
};

// MAP
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/sevaric/cj1eip4bc002n2rtcu9xo1j35',
  center: [-79.5, 38],
  zoom: 6,
  interactive: false,
  attributionControl: false
}).addControl(new mapboxgl.AttributionControl({
  compact: true
})).on('load', () => {
  map.addSource('counties', {
    "type": "vector",
    "url": "mapbox://sevaric.a2ck10lt"
  });

  map.addLayer({
    "id": "va-countiesgeojson",
    "type": "fill",
    "source": "counties",
    "source-layer": "va_countiesgeojson",
    "paint": {
      "fill-outline-color": "#6B6B6B",
      "fill-color": "hsla(0, 0%, 0%, 0)"
    },
    "filter": ['!in', 'NAMELSAD10', 'Lexington city', 'Fairfax city', 'Williamsburg city']
  }, 'place-neighbourhood');

  setTimeout(() => {
    Virginia = map.querySourceFeatures('counties', {
      sourceLayer: 'va_countiesgeojson'
    });

    drawChoropleth(map, performance, stops, Virginia);

    resetBounds(map);
    overlaySetup(map);

    //loader.finish();

    // Tooltip for Names
    map.on('mousemove', 'va-countiesgeojson', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      var county = e.features[0];
      if (county && focus === false) {
        overlay.innerHTML = '';
        var dataIndex = sol.findIndex((e) => {return (e.name.toLowerCase() === county.properties.NAMELSAD10.toLowerCase());});
        var title = document.createElement('h4');
        title.textContent = county.properties.NAME10;
        var fund = document.createElement('p');
        fund.textContent = `Funds per Capita (14-15): $${finance[dataIndex].total_2014}`;
        var scoresIntro = document.createElement('p');
        scoresIntro.textContent = "Average SOL Scores (14-15):";
        var scores = document.createElement('ul');
        scores.innerHTML = `<li>Writing: ${sol[dataIndex].writing_2014}</li>
                            <li>Reading: ${sol[dataIndex].reading_2014}</li>
                            <li>History: ${sol[dataIndex].history_2014}</li>
                            <li>Math: ${sol[dataIndex].math_2014}</li>
                            <li>Science: ${sol[dataIndex].science_2014}</li>`;
        overlay.appendChild(title);
        overlay.appendChild(fund);
        overlay.appendChild(scoresIntro);
        overlay.appendChild(scores);
        overlay.parentNode.parentNode.style.display = 'block';
        document.getElementById('menubox').style.display='none';
      } else if (focus === true) {
        overlay.parentNode.parentNode.style.display = 'none';
      }
    });

    map.on('mouseleave', 'va-countiesgeojson', (e) => {
      map.getCanvas().style.cursor = '';
      overlay.innerHTML = '<input id="search" type="text" placeholder="Search for a place..."/>';
      document.getElementById('menubox').style.display = 'block';
      overlaySetup(map);
    });

    // Zoom in and out on map
    map.on('click', 'va-countiesgeojson', (e) => {
      var county = e.features;
      if (county.length > 0 && focus === false) {
        overlay.parentNode.parentNode.style.display = 'none';
        filterMap(map, ['in', 'NAME10', county[0].properties.NAME10]);
        zoomToFeature(county, map);
        focusFeature(county, map);
        searchBox.value = '';
      } else {
        overlay.parentNode.style.display = 'block';
        unfocus(map);
        resetBounds(map);
        map.setFilter('va-countiesgeojson', ['!=', 'NAME10', '']);
        drawChoropleth(map, performance, stops, Virginia);
      }
    });
  }, 500);
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
    var regex = new RegExp('(\\s|^)' + className + '(\\s|$)');
    element.className = element.className.replace(regex, ' ');
  }
};

const zoomToFeature = (target, map) => {
  map.fitBounds(queryBounds(target), {
    padding: 50
  });
};

var prevSearch = "";

const overlaySetup = (map) => {
  const searchBox = document.getElementById('search');
  searchBox.addEventListener('keyup', (e) => {
    var value = e.target.value.trim().toLowerCase();

    // Filter visible features that don't match the input value.
    var filtered = Virginia.filter((feature) => {
      var name = feature.properties.NAMELSAD10.trim().toLowerCase();
      return name.indexOf(value) > -1;
    });

    if (filtered.length === 1 && focus === false) {
      zoomToFeature(filtered, map);
      focusFeature(filtered, map);
    }

    // Set the filter to populate features into the layer.
    filterMap(map, ['in', 'NAMELSAD10'].concat(filtered.map((feature) => {
      return feature.properties.NAMELSAD10;
    })));

    if (value.length > prevSearch.length) {
      zoomToFeature(filtered, map);
    } else if (prevSearch.length > value.length && focus === true) {
      unfocus(map);
    } else {
      resetBounds(map);
    }
    prevSearch = value;
  });

  var radios = document.getElementsByName('heatmap');

  document.querySelector('#menubox>form>select').addEventListener('change', () => {
    year = document.querySelector('#menubox>form>select').value;
    for (var i = 0; i < gradientResolution; i++) {
      map.removeLayer(`choropleth${i}`);
    }
    for (var d = 0; d < radios.length; d++) {
      if (radios[d].checked) {
          updateMap(radios[d].value);
          break;
      }
    }
  });

  radios[0].addEventListener('change', () => {
    if (radios[0].checked) {
      for (var i = 0; i < gradientResolution; i++) {
        map.removeLayer(`choropleth${i}`);
      }
      updateMap(radios[0].value);
    }
  });

  radios[1].addEventListener('change', () => {
    if (radios[1].checked) {
      for (var i = 0; i < gradientResolution; i++) {
        map.removeLayer(`choropleth${i}`);
      }
      updateMap(radios[1].value);
    }
  });

  radios[2].addEventListener('change', () => {
    if (radios[2].checked) {
      for (var i = 0; i < gradientResolution; i++) {
        map.removeLayer(`choropleth${i}`);
      }
      updateMap(radios[2].value);
    }
  });
};

var updateMap = (mode => {
  if (mode === "perform") {
    populatePerformance(finance, sol);
    calculateStops(performance);
    drawChoropleth(map, performance, stops, Virginia);
  } else if (mode === "fund") {
    performance = finance.map((county) => {
      return county[`total_${year}`];
    });
    calculateStops(performance);
    drawChoropleth(map, performance, stops, Virginia);
  } else if (mode === "achieve") {
    performance = sol.map((county) => {
      return (county[`history_${year}`] + county[`math_${year}`] + county[`reading_${year}`] + county[`science_${year}`] + county[`writing_${year}`]) / 5;
    });
    calculateStops(performance);
    drawChoropleth(map, performance, stops, Virginia);
  }
});

// It just works ;)
const queryBounds = (featureList) => {
  var globalBounds = featureList.reduce((globalBounds, feature) => {
    var coordinates = feature.geometry.coordinates;
    if (feature.geometry.type === "Polygon") {
      var featureBounds = coordinates.reduce((featureBounds, shape) => {
        return featureBounds.extend(findBounds(shape));
      }, new mapboxgl.LngLatBounds());
      return globalBounds.extend(featureBounds);
    } else if (feature.geometry.type === "MultiPolygon") {
      var featureGroupBounds = coordinates.reduce((featureGroupBounds, polygon) => {
        var featureBounds = polygon.reduce((featureBounds, shape) => {
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
  var bounds = geometry.reduce((bounds, coordinates) => {
    return bounds.extend(coordinates);
  }, new mapboxgl.LngLatBounds());
  return bounds;
};

const resetBounds = (map) => {
  zoomToFeature(Virginia, map);
};

const filterMap = (map, query) => {
  drawChoropleth(map, performance, stops, map.querySourceFeatures('counties', {
    sourceLayer: 'va_countiesgeojson',
    filter: query
  }));
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
  var dataIndex = sol.findIndex((e) => {return (e.name.toLowerCase() === target[0].properties.NAMELSAD10.toLowerCase());});
  focus = true;
  addClass(sidebar, 'focus');
  addClass(mapDiv, 'focus');
  map.resize();

  var nameHeader = document.querySelector('#analysis>h2');
  nameHeader.textContent = target[0].properties.NAME10;

  var income = document.getElementById("income");
  var scores = document.getElementById("scores");
  var allocation = document.getElementById("allocation");

  var financeData = finance[dataIndex];
  console.log(financeData);
  var testData = sol[dataIndex];

  var incomeLine = new Chart(income, {
    type: 'line',
    data: {
      labels: ["11-12", "12-13", "13-14", "14-15"],
      datasets: [{
        backgroundColor: "#FFCE56",
        label: 'Total Funding',
        data: [financeData.total_2011, financeData.total_2012, financeData.total_2013, financeData.total_2014]
      }],
    },
    options: {
      scale: {
        ticks: {
          beginAtZero: false
        }
      },
    }
  });

  var scoreline = new Chart(scores, {
    type: 'line',
    data: {
      labels: ["11-12", "12-13", "13-14", "14-15"],
      datasets: [{
        borderColor: "#FFCE56",
        label: 'Writing',
        data: [testData.writing_2011, testData.writing_2012, testData.writing_2013, testData.writing_2014]
      }, {
        borderColor: "#4BC0C0",
        label: 'Reading',
        data: [testData.reading_2011, testData.reading_2012, testData.reading_2013, testData.reading_2014]
      }, {
        borderColor: "#E7E9ED",
        label: 'History',
        data: [testData.history_2011, testData.history_2012, testData.history_2013, testData.history_2014]
      }, {
        borderColor: "#FF6384",
        label: 'Math',
        data: [testData.math_2011, testData.math_2012, testData.math_2013, testData.math_2014]
      }, {
        borderColor: "#36A2EB",
        label: 'Science',
        data: [testData.science_2011, testData.science_2012, testData.science_2013, testData.science_2014]
      }],
    },
    options: {
    }
  });

  var allocLine = new Chart(allocation, {
    type: 'line',
    data: {
      labels: ["11-12", "12-13", "13-14", "14-15"],
      datasets: [{
        backgroundColor: "#FFCE56",
        label: 'Incentive Funding',
        data: [financeData.incentive_2011*100/financeData.total_2011, financeData.incentive_2012*100/financeData.total_2012, financeData.incentive_2013*100/financeData.total_2013, financeData.incentive_2014*100/financeData.total_2014]
      }, {
        backgroundColor: "#4BC0C0",
        label: 'Catergorical Funding',
        data: [financeData.catergorical_2011*100/financeData.total_2011, financeData.catergorical_2012*100/financeData.total_2012, financeData.catergorical_2013*100/financeData.total_2013, financeData.catergorical_2014*100/financeData.total_2014]
      }, {
        backgroundColor: "#E7E9ED",
        label: 'Lottery Funding',
        data: [financeData.lottery_2011*100/financeData.total_2011, financeData.lottery_2012*100/financeData.total_2012, financeData.lottery_2013*100/financeData.total_2013, financeData.lottery_2014*100/financeData.total_2014]
      }, {
        backgroundColor: "#FF6384",
        label: 'SOQ Funding',
        data: [financeData.soq_2011*100/financeData.total_2011, financeData.soq_2012*100/financeData.total_2012, financeData.soq_2013*100/financeData.total_2013, financeData.soq_2014*100/financeData.total_2014]
      }],
    },
    options: {
      scales: {
        yAxes: [{
          stacked: true,
          ticks: {
            min: 0,
            max: 25
          }
        }]
      }
    }
  });
};

const unfocus = (map => {
  focus = false;
  removeClass(sidebar, 'focus');
  removeClass(mapDiv, 'focus');
  map.resize();
});

setTimeout(() => {

}, 2000);
