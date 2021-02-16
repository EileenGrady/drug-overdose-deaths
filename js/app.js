(function() {

  var map = L.map('map', {
    zoomSnap: .1,
    center: [37.361629, -96.787994],
    zoom: 4.5,
    minZoom: 2
  });

  // mapbox API access Token
  // var accessToken = 'pk.eyJ1IjoiZWlsZWVuZ3JhZHkiLCJhIjoiY2pvaHhzbjFjMDNicDNwcDg3NGVvcGhxNiJ9.GdcUBqfqPJH674P0rgCctg'

  // request a mapbox raster tile layer and add to map
  // L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + accessToken, {
  //   attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
  //   maxZoom: 18,
  //   id: 'mapbox.dark',
  //   accessToken: accessToken
  // }).addTo(map);

  // update basemap to Carto dark basemap
  var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // use omnivore to load the CSV data
  omnivore.csv('data/drug_overdose_deaths_2017.csv')
    .on('ready', function(e) {
      drawMap(e.target.toGeoJSON());
      drawLegend(e.target.toGeoJSON());
    })
    .on('error', function(e) {
      console.log(e.error[0].message);
    })


  function drawMap(data) {
    var options = {
      pointToLayer: function(feature, ll) {
        return L.circleMarker(ll, {
          opacity: 1,
          weight: 2,
          fillOpacity: 0,
        })
      }
    }
    var dataLayer = L.geoJson(data, options).addTo(map);

    dataLayer.setStyle({
      color: '#E45E2C',
    });

    resizeCircles(dataLayer, 1);

    sequenceUI(dataLayer);

    drawMonthLegend();

  }

  function calcRadius(val) {

    var radius = Math.sqrt(val / Math.PI);
    return radius * 1.5

  }

  function resizeCircles(dataLayer, currentMonth) {

    dataLayer.eachLayer(function(layer) {
      var radius = calcRadius(Number(layer.feature.properties['M' + currentMonth]));
      layer.setRadius(radius);
    });


    retrieveInfo(dataLayer, currentMonth);
  }

  function sequenceUI(dataLayer) {
    // create Leaflet control for the slider
    var sliderControl = L.control({
      position: 'bottomleft'
    });

    sliderControl.onAdd = function(map) {

      var controls = L.DomUtil.get("slider");

      L.DomEvent.disableScrollPropagation(controls);
      L.DomEvent.disableClickPropagation(controls);

      return controls;

    }

    sliderControl.addTo(map);

    //select the slider's input and listen for change
    $('#slider input[type=range]')
      .on('input', function() {

        // current value of slider is current month
        var currentMonth = this.value;

        // resize the circles with updated month
        resizeCircles(dataLayer, currentMonth);

        //select the month legend and update with current month
        $('#month-legend span').html(getMonth(currentMonth));

      });
  }

  function drawLegend(data) {
    // create Leaflet control for the legend
    var legendControl = L.control({
      position: 'bottomright'
    });

    // when the control is added to the map
    legendControl.onAdd = function(map) {

      // select the legend using id attribute of legend
      var legend = L.DomUtil.get("legend");

      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(legend);
      L.DomEvent.disableClickPropagation(legend);

      // return the selection
      return legend;

    }

    legendControl.addTo(map);

    // loop through all features (i.e., the states)
    var dataValues = data.features.map(function(points) {
      // for each grade in a school
      for (var state in points.properties) {
        // shorthand to each value
        var value = points.properties[state];
        // if the value can be converted to a number
        if (+value) {
          //return the value to the array
          return +value;
        }
      }
    });

    // sort our array
    var sortedValues = dataValues.sort(function(a, b) {
      return b - a;
    });

    // round the highest number and use as our large circle diameter
    var maxValue = Math.round(sortedValues[0] / 1000) * 1000;

    // calc the diameters
    var largeDiameter = calcRadius(maxValue) * 2,
      smallDiameter = largeDiameter / 2;

    // select our circles container and set the height
    $(".legend-circles").css('height', largeDiameter.toFixed());

    // set width and height for large circle
    $('.legend-large').css({
      'width': largeDiameter.toFixed(),
      'height': largeDiameter.toFixed()
    });

    // set width and height for small circle and position
    $('.legend-small').css({
      'width': smallDiameter.toFixed(),
      'height': smallDiameter.toFixed(),
      'top': largeDiameter - smallDiameter,
      'left': smallDiameter / 2
    })

    // label the max and median value
    $(".legend-large-label").html(maxValue.toLocaleString());
    $(".legend-small-label").html((maxValue / 2).toLocaleString());

    // adjust the position of the large based on size of circle
    $(".legend-large-label").css({
      'top': -11,
      'left': largeDiameter + 30,
    });

    // adjust the position of the large based on size of circle
    $(".legend-small-label").css({
      'top': smallDiameter - 11,
      'left': largeDiameter + 30
    });

    // insert a couple hr elements and use to connect value label to top of each circle
    $("<hr class='large'>").insertBefore(".legend-large-label")
    $("<hr class='small'>").insertBefore(".legend-small-label").css('top', largeDiameter - smallDiameter - 8);
  }

  function drawMonthLegend() {
    // create Leaflet control for the temporal legend
    var monthLegendControl = L.control({
      position: 'bottomleft'
    });

    // when the control is added to the map
    monthLegendControl.onAdd = function(map) {

      // select the temporal legend using id attribute of grade-legend
      var monthLegend = L.DomUtil.get("month-legend");

      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(monthLegend);
      L.DomEvent.disableClickPropagation(monthLegend);

      // return the selection
      return monthLegend;

    }

    monthLegendControl.addTo(map);

  }

  function retrieveInfo(dataLayer, currentMonth) {
    // select the element and reference with variable
    // and hide it from view initially

    var info = $('#info').hide();

    // since boysLayer is on top, use to detect mouseover events
    dataLayer.on('mouseover', function(e) {

      // remove the none class to display and show
      info.show();

      // access properties of target layer
      var props = e.layer.feature.properties;

      // populate HTML elements with relevant info
      $('#info span').html(props.State);
      $(".death").html(Number(props['M' + currentMonth]).toLocaleString());
      $(".month").html(getMonth(currentMonth));


      //create empty arrays to push all grade enrollment values into
      var dataValues = [];

      //push values into those arrays to be used for sparklines
      for (var i = 1; i <= 8; i++) {
        dataValues.push(props['M' + i]);
      }

      //create sparklines to show on info windows
      $('.dataspark').sparkline(dataValues, {
        width: '200px',
        height: '30px',
        lineColor: '#E43B2C',
        fillColor: '#E45E2C',
        spotRadius: 0,
        lineWidth: 2
      });

      // raise opacity level as visual affordance
      e.layer.setStyle({
        fillOpacity: .6
      });

    });

    // hide the info panel when mousing off layergroup and remove affordance opacity
    dataLayer.on('mouseout', function(e) {

      // hide the info panel
      info.hide();

      // reset the layer style
      e.layer.setStyle({
        fillOpacity: 0
      });
    });

    // when the mouse moves on the document
    $(document).mousemove(function(e) {
      // first offset from the mouse position of the info window
      info.css({
        "left": e.pageX + 6,
        "top": e.pageY - info.height() - 25
      });

      // if it crashes into the top, flip it lower right
      if (info.offset().top < 4) {
        info.css({
          "top": e.pageY + 15
        });
      }
      // if it crashes into the right, flip it to the left
      if (info.offset().left + info.width() >= $(document).width() - 40) {
        info.css({
          "left": e.pageX - info.width() - 80
        });
      }
    });

  }

  //function to translate the number of a month into its Name to display on info window and temporal legend
  function getMonth(currentMonth) {
    if (currentMonth == '1') {
      return 'January'
    } else if (currentMonth == '2') {
      return 'February'
    } else if (currentMonth == '3') {
      return 'March'
    } else if (currentMonth == '4') {
      return 'April'
    } else if (currentMonth == '5') {
      return 'May'
    } else if (currentMonth == '6') {
      return 'June'
    } else if (currentMonth == '7') {
      return 'July'
    } else if (currentMonth == '8') {
      return 'August'
    } else if (currentMonth == '9') {
      return 'September'
    } else if (currentMonth == '10') {
      return 'October'
    } else if (currentMonth == '11') {
      return 'November'
    } else if (currentMonth == '12') {
      return 'December'
    }
  }

})();
