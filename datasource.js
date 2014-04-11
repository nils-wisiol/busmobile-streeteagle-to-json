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
var staticdata = {};

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
  data.stop = find('AddStop', body, ['title', 'longitude', 'latitude', 'icon', 'route']);

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
      staticdata.stop = parsed.stop;
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

