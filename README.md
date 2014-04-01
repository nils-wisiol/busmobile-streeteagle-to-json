# busmobile-streeteagle-to-json
node.js http server that serves JSON formatted data pulled from busmobile.streeteagle.com or any other compartible data source. The data will constantly be updated on the server side.

## How to run
In a terminal,
```
$ node server.js
```
Then navigate your browser to http://127.0.0.1:1337/

## How to send a request
Send any HTTP request to the server in order to get the data back.

## How the response will look like
### Server out of order
During startup, when no data is available, a 503 response will be send back. If an error happened during the last time the server tried to obtain a data update, 500 will be returned.

### Successful response
A content-type application/json status 200 response will be returned. It will look like:

```
{
    bus: [ /* array of busses */ ],
    stop: [ /* array of stops */ ],
    timestamp: /* timestamp of last udpate */,
}
```   
 
Where a bus is a object like
```
{
    id:
    title:
    address:
    longitude:
    latitude:
    iconColor:
    direction:
    speed:
    timestamp:
    lastStop:
    route:
}
```
    
and stop is an object like
```
{
    title:
    longitude:
    latitude:
    icon:
    route:
}
```
    
For the current data source, stops seems to be always empty. Also certain fields are never filled with actual values.

The age of the data will be send as the timestamp. The current update interval is 15.0 seconds.
    
