http = require('http');
csv = require('csv');
fs = require('fs');

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
    { name: 'Creekside North', latitude: 43.011410, longitude: -78.792681, departure: [] },
    { name: 'Creekside South', latitude: 43.010907, longitude: -78.790595, departure: [] },
    { name: 'Ellicott Tunnel', latitude: 43.008193, longitude: -78.785898, departure: [] },
    { name: 'South Lake (to Spine)', latitude: 43.003391, longitude: -78.7782870, departure: [] },
    { name: 'Alumni/Stadium (to Spine)', latitude: 43.000213, longitude: -78.780025, departure: [] },
    { name: 'Center for the Arts', latitude: 43.000245, longitude: -78.782852, departure: [] },
    { name: 'Lockwood (to Spine)', latitude: 42.999825, longitude: -78.785197, departure: [] },
    { name: 'Baldy/O\'Brian', latitude: 43.000170, longitude: -78.787493, departure: [] },
    { name: 'Founder\'s Plaza', latitude: 43.000346, longitude: -78.788942, departure: [] },
    { name: 'Cooke / Hochstetter', latitude: 42.999519, longitude: -78.791130, departure: [] },
    { name: 'Natural Sciences Complex', latitude: 43.000076, longitude: -78.792584, departure: [] },
    { name: 'Flickinger Court', latitude: 43.005211, longitude: -78.800545, departure: [] },
    { name: 'Hadley Village', latitude: 42.998587, longitude: -78.794888, departure: [] },
    { name: 'Computing Center', latitude: 43.001437, longitude: -78.792442, departure: [] },  
    { name: 'Lower Capen', latitude: 43.001441, longitude: -78.789647, departure: [] },
    { name: 'Student Union', latitude: 43.001724, longitude: -78.786203, departure: [] },
    { name: 'Lockwood (to Ellicot)', latitude: 43.001055, longitude: -78.785380, departure: [] },
    { name: 'Alumni/Stadium (to Ellicot)', latitude: 43.000213, longitude: -78.780025, departure: [] },
    { name: 'South Lake (to Ellicot)', latitude: 43.002320, longitude: -78.776495, departure: [] },
    { name: 'Greiner Hall', latitude: 43.006698, longitude: -78.785858, departure: [] },
  ],
};

/**
 * The current status of the server.
 */
var status = 503; // currently unavailable (for startup phase)

/**
 * Reads a CSV schedule file of the following format:
 * Each line looks like:
 * STOP NAME, DEP TIME, DEP TIME, DEP TIME, DEP TIME, DEP TIME
 * The filename is the name of the route.
 * 
 * The read departure times will be added to the stop as found in the stops array.
 */
function parseRouteSchedule(name, stops, days) {

  function findStopByName(name) {
    var result = null;
    staticdata.stop.forEach(function(s) {
      if (s.name == name)
        result = s;
    });
    return result;
  }

  csv()
  .from.path(__dirname+'/schedules/' + name + '.csv', { delimiter: ',', escape: '"' })
  .on('record', function(row,index){
    var stop = findStopByName(row[0]);
    
    var times = [];
    var lastHours = 0;
    var offset = 0;
    row.splice(1).forEach(function(t) {
      // normalize time
      if (t=='') return;
      var hours = t.match(/([0-1]?[0-9]):/)[1] - 0;
      var minutes = t.match(/:([0-5]?[0-9])/)[1] - 0;
      if (lastHours > hours) offset += 12;
      lastHours = hours;
      
      // Add departure time to the stop object
      stop.departure.push({
        time: { hours: (hours + offset), minutes: (minutes < 10 ? '0' + minutes : minutes) },
        days: days,
        route: name,
      })
    });
  })
  .on('error', function(error){
    console.log(error.message);
  });
}

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

/**
 * Start polling the data from the data source.
 */
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

// read static schedule data
parseRouteSchedule('North Campus Shuttle Weekday', staticdata.stop, [0,1,2,3,4]);

module.exports = {
  getData: function() { return data; },
  getStaticData: function() { return staticdata; },
  startPolling: startPolling
};

