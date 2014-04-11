http = require('http');

/**
 * The server's data source
 */
var options = {
  hostname: 'busmobile.streeteagleweb.com',
  port: 80,
  path: '/MobileMap.aspx?Key=mb3rJjs1vsullCg4',
  method: 'GET'
};

/**
 * Polling interval (ms)
 */
var interval = 750;

/**
 * The data currently served by this server
 */
var data = {};

/**
 * Data served by this server that is not expected to change
 */
var staticdata = {
  stop: [
    { name: 'Creekside North', latitude: 43.011410, longitude: -78.792681 },
    { name: 'Creekside South', latitude: 43.010907, longitude: -78.790595 },
    { name: 'Ellicot Tunnel', latitude: 43.008193, longitude: -78.785898 },
    { name: 'South Lake (to Spine)', latitude: 43.003391, longitude: -78.7782870 },
    { name: 'Alumni/Stadium (to Spine)', latitude: 43.000213, longitude: -78.780025 },
    { name: 'Center for the Arts', latitude: 43.000245, longitude: -78.782852 },
    { name: 'Lockwood (to Spine)', latitude: 42.999825, longitude: -78.785197 },
    { name: 'Baldy/O\'Brian', latitude: 43.000170, longitude: -78.787493 },
    { name: 'Founder\'s Plaza', latitude: 43.000346, longitude: -78.788942 },
    { name: 'Cooke / Hochstetter', latitude: 42.999519, longitude: -78.791130 },
    { name: 'Natural Sciences Complex', latitude: 43.000076, longitude: -78.792584 },
    { name: 'Flickinger Court', latitude: 43.005211, longitude: -78.800545 },
    { name: 'Hadley Village', latitude: 42.998587, longitude: -78.794888 },
    { name: 'Computing Center', latitude: 43.001437, longitude: -78.792442 },  
    { name: 'Lower Capen', latitude: 43.001441, longitude: -78.789647 },
    { name: 'Student Union', latitude: 43.001724, longitude: -78.786203 },
    { name: 'Lockwood (to Ellicot)', latitude: 43.001055, longitude: -78.785380 },
    { name: 'Alumni/Stadium (to Ellicot)', latitude: 43.000213, longitude: -78.780025 },
    { name: 'South Lake (to Ellicot)', latitude: 43.002320, longitude: -78.776495 },
    { name: 'Greiner Hall', latitude: 43.006698, longitude: -78.785858 },
  ],
};

/**
 * The current status of the server.
 */
var status = 503; // currently unavailable (for startup phase)

/**
 * Parses a response from the data source
 */
function parseResponse(body) {

  /**
   * Extract data from a response from the data source.
   */
  function find(funcName, body, fields) {
    var result = [];
    
    // Parse bus for each "AddBus()"
    var regex = new RegExp(funcName + '\\([^\\)]+\\);', 'g');
    (body.match(regex) || []).forEach(function(b) {
      // convert to JSON string and parse
      var parsed = JSON.parse("[" + b.replace(/\'/g, '"').substr(funcName.length+1,b.length-funcName.length-3) + "]");
      // assign field names
      var res = {};
      var i = 0;
      fields.forEach(function(f) {
        res[fields[i]] = parsed[i];
        i++;
      });
      result.push(res);
    });
    
    return result;
  }
  
  /**
   * Convert component color notation into CSS hex notation
   */
  function rgbToHex(r, g, b) {
      function componentToHex(c) {
        var hex = (c-0).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }
      
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }  

  // Object to hold the parsed data
  var data = {
    bus: [],
    stop: [],
    route: [],
    timestamp: new Date(),
  };
  
  
  // get the data that chages
  data.bus = find('AddBus', body, ['id', 'title', 'address', 'latitude', 'longitude', 'iconColor', 'direction', 'speed', 'timestamps', 'lastStop', 'route']);
  
  // get the data that is expected to stay the same
  // screw that, there is no data provided by this source anyways.
  //data.stop = find('AddStop', body, ['title', 'longitude', 'latitude', 'icon', 'route']);

  var regex = /ResetRoutePoints\(\);(AddRoutePoint\(-?[0-9]*\.[0-9]*, -?[0-9]*\.[0-9]*\);)*AddRouteToMap\([0-9]*, [0-9]*, [0-9]*, [0-9]*\);/g;
  (body.match(regex) || []).forEach(function(r) {
    var innerregex = /AddRoutePoint\((-?[0-9]*\.[0-9]*), (-?[0-9]*\.[0-9]*)\);/g
    var routeinfo = r.match(/AddRouteToMap\(([0-9]*), ([0-9]*), ([0-9]*), ([0-9]*)\);/);
    var route = {
      points: [],
      color: rgbToHex(routeinfo[1], routeinfo[2], routeinfo[3]),
      width: routeinfo[5],
    };    
    data.route.push(route);
    (r.match(innerregex) || []).forEach(function(p) {
      route.points.push({
        latitude: p.match(/\((-?[0-9]*\.[0-9]*), /)[1],
        longitude: p.match(/, (-?[0-9]*\.[0-9]*)\)/)[1],
      });
    });
  });

  return data;
}

/**
 * Update the data known
 */
function updateData(callback) {
  console.log("Starting update ...");

  var req = http.get(options, function(res) {
    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.on('data', function(chunk) {
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = Buffer.concat(bodyChunks).toString();
      var parsed = parseResponse(body);
      data.bus = parsed.bus;
      staticdata.route = parsed.route;
      status = 200;
      callback(true);
    });
  });

  req.on('error', function(e) {
    console.log('Could not update data: ' + e.message);
    status = 500; // unknown error
    callback(false);
  });  
}

// set up polling job
function startPolling(cb) {
  var task_is_running = false;
  function poll(){
      if(!task_is_running){
          task_is_running = true;
          updateData(function(result){
              console.log("Update completed. Currently, there are " + data.bus.length + " busses, " + staticdata.stop.length + " stops, " + staticdata.route.length + " routes.");
              if (cb) cb(result, data, true); // TODO set changed flag accordingly
              task_is_running = false;
          });
      }
  }  
  setInterval(poll, interval);
  poll();
}

module.exports = {
  getData: function() { return data; },
  getStaticData: function() { return staticdata; },
  startPolling: startPolling
};

