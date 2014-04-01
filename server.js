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
var interval = 15000;

/**
 * The data currently served by this server
 */
var data;

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

  // Object to hold the parsed data
  var data = {
    bus: [],
    stop: [],
    timestamp: new Date(),
  };
  
  data.bus = find('AddBus', body, ['id', 'title', 'address', 'longitude', 'latitude', 'iconColor', 'direction', 'speed', 'timestamps', 'lastStop', 'route']);
  data.stop = find('AddStop', body, ['title', 'longitude', 'latitude', 'icon', 'route']);

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
      data = parseResponse(body);
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

// Create a HTTP server
http.createServer(function (req, res) {
  switch (status) {
    case 200:
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(data));
      break;
    case 500:
    case 503:
    default:
      res.writeHead(status);
      res.end();
      break;
  }
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');

// set up polling job
var task_is_running = false;
setInterval(function(){
    if(!task_is_running){
        task_is_running = true;
        updateData(function(result){
            console.log("Update done. Status: " + status);
            task_is_running = false;
        });
    }
}, interval);

