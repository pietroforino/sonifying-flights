import "./style.css";
import WAAClock from "waaclock";
// import "./socket.js";

const SCALE = [60, 62, 64, 65, 67, 69, 71]; // Major

let audioButton = document.querySelector("#audioButton");
let visContainer = document.querySelector("#vis");

let audioCtx = new AudioContext();
let clock = new WAAClock(audioCtx, { toleranceEarly: 0.1 });
let firstStart = true;
let clockEvents = [];
let energy = 0.5;


let loopUrl = [
  "/loops/loop_1.mp3",
  "/loops/loop_2.mp3",
  "/loops/loop_3.mp3",
  "/loops/loop_4.mp3",
  "/loops/loop_5.mp3",
  "/loops/loop_6.mp3"
]
let loopBuffers = [];
let bufferSourceNodes_loopsList = [];

let oneshotBuffers = [];
let oneshotUrl = [
  "/oneshots/oneshot_1.mp3",
  "/oneshots/oneshot_2.mp3",
  "/oneshots/oneshot_3.mp3",
  "/oneshots/oneshot_4.mp3",
]
let bufferSourceNodes_oneshotsList = [];


var center = [9, 45];
var sphereRadius = 50;
var precision = 0.25;
var epsilon = 1; // small number so that grid cells have some non zero height

function loadBuffer(url) {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buffer) => audioCtx.decodeAudioData(buffer));
}

function mtof(midi) {
  return Math.pow(2, (midi - 69) / 12) * 440;
}


async function startLoop() {

  for( let i=0; i < bufferSourceNodes_loopsList.length; i++) {
    // create
    let gain = audioCtx.createGain();
    let filter = audioCtx.createBiquadFilter();

    // Configure
    bufferSourceNodes_loopsList[i].loop = true;
    gain.gain.value = 2.0;

    filter.type = "bandpass";
    filter.frequency.value = 1000 + Math.random() * 10000;
    filter.Q.value = 100;


    // Connect
    bufferSourceNodes_loopsList[i].connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);


    // start
    bufferSourceNodes_loopsList[i].start();
  }
  // create

  /*
  // Create
  let bufferSrcNode = audioCtx.createBufferSource();
  let gain = audioCtx.createGain();

  // Configure
  let buffer = await loadBuffer("/loops/ai1_atmosphere_loop_factotum_60_C.mp4");
  bufferSrcNode.buffer = buffer;
  bufferSrcNode.loop = true;
  gain.gain.value = 0.6;

  // Connect
  bufferSrcNode.connect(gain);
  gain.connect(audioCtx.destination);

  // Start
  bufferSrcNode.start();
  */
}

async function startEverything() {
  await audioCtx.resume();

  // do this same stuff with reverb
  //let saturator = new AudioWorkletNode(audioCtx, "saturator");
  //saturator.connect(audioCtx.destination);
  clock.start();


  // load loops
  for (let i=0; i < loopUrl.length; i++) {
    console.log( loopUrl[i] );
    loopBuffers.push( await loadBuffer( loopUrl[i] ) );
  }
  //console.log( loopBuffers );

/*
  // load oneshots
  for (let i=0; i < oneshotUrl.length; i++) {
    console.log( oneshotUrl[i] );
    oneshotBuffers.push( await loadBuffer( oneshotUrl[i] ) );
  }
  //console.log( oneshotBuffers );
  */
}


function deg2rad(deg) {
  return deg * (Math.PI/180)
}


function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}




function lerp( min, max, value) {
  return min + value * (max - min);
}

let currentFlightData = {};

async function emitNewSounds( data ) {
  console.log("emit new sounds")


  for( let i=0; i < currentFlightData.length; i++) {
    if( currentFlightData[i]["bufferNode"] ) {
      currentFlightData[i]["bufferNode"].stop();
    }
  }
  currentFlightData = {};


  currentFlightData = data;
  let volume = 1.0 / currentFlightData.length;


  //console.log( currentFlightData.length );

  for( let i=0; i < currentFlightData.length; i++) {
    // for every flight lets create a new sound
    let id = currentFlightData[i]["flight_id"];

    let volumeByGS = Math.min(1.0, currentFlightData[i]["Ground Speed"] / 700);

    let volumeByAltitude =  getDistanceFromLatLonInKm(currentFlightData[i]["Latitude"], currentFlightData[i]["Longitude"], clickedCoordinates[1], clickedCoordinates[0]);

    //console.log( currentFlightData[i]["Latitude"], currentFlightData[i]["Longitude"], clickedCoordinates[1], clickedCoordinates[0] );
    //console.log( volumeByAltitude );

    currentFlightData[i]["bufferNode"] = audioCtx.createBufferSource();
    currentFlightData[i]["gainNode"] = audioCtx.createGain();
    currentFlightData[i]["filterNode"] = audioCtx.createBiquadFilter();
    currentFlightData[i]["stereoPanner"] = audioCtx.createStereoPanner();


    // Configure
    currentFlightData[i]["bufferNode"].buffer = loopBuffers[ Math.floor( Math.random()*loopBuffers.length)];
    currentFlightData[i]["bufferNode"].loop = true;
    currentFlightData[i]["bufferNode"].playbackRate.value = 1.0;
    currentFlightData[i]["gainNode"].gain.value = 1.0; // volume

    currentFlightData[i]["filterNode"].type = "bandpass";
    currentFlightData[i]["filterNode"].frequency.value = lerp(1000, 10000, currentFlightData[i]["Altitude"]/45000);
    currentFlightData[i]["filterNode"].Q.value = 100;

    currentFlightData[i]["stereoPanner"].pan.value = Math.cos( currentFlightData[i]["Heading"] * Math.PI / 180.0 );


    // Connect
    currentFlightData[i]["bufferNode"].connect( currentFlightData[i]["filterNode"] );
    currentFlightData[i]["filterNode"].connect( currentFlightData[i]["gainNode"] );
    currentFlightData[i]["gainNode"].connect( currentFlightData[i]["stereoPanner"] );
    currentFlightData[i]["stereoPanner"].connect(audioCtx.destination);

    // start
    currentFlightData[i]["bufferNode"].start();
  }

  console.log( currentFlightData );

}



// PRINCIPALE
async function toggleAudio() {
  if (firstStart) {
    await startEverything();
    firstStart = false;
  } else if (audioCtx.state === "running") {
    await audioCtx.suspend();
  } else {
    await audioCtx.resume();
  }

  await sendFlightRequest(49.00, 2.548, 5000)

  if( flightData === undefined) {
    return;
  }

  //await destoyPrevSounds();
  // according to the flight we are tracking,
  // let's create corresponding sounds
  await emitNewSounds( flightData );
}





let flightData;

//sendFlightRequest = (lat, long, r) => {
async function sendFlightRequest(lat, long, r) {
  const param = {
    "lat": lat,
    "long": long,
    "radius": r,
  }
  fetch("http://127.0.0.1:5000/receiver",
  {
      method: 'POST',
      headers: {
          'Content-type': 'application/json',
          'Accept': 'application/json'
      },

  body:JSON.stringify(param)}).then(res=>{
          if(res.ok){
              return res.json()
          }else{
              alert("something is wrong")
          }
      }).then(jsonResponse=>{
          flightData = jsonResponse
          //return( flightData )
          //console.log(flightData)
      }
      ).catch((err) => console.error(err));
}


// Function to create a GeoJSON circle
function createGeoJSONCircle(center, radiusInKm) {
  const options = { steps: 64, units: 'kilometers' };
  const circle = turf.circle(center, radiusInKm, options);
  return circle;
}

mapboxgl.accessToken = 'pk.eyJ1IjoicGlldHJvZm9yaW5vIiwiYSI6ImNqeHgzd3JwajBrc2YzaXBma3UxODdmdWUifQ.8jG3b2D80IsptKlqlr0l8w';

var map = new mapboxgl.Map({
    container: 'map',
    style : 'mapbox://styles/pietroforino/cls4jzs56003h01r04o83h8hw',
    center: center,
    zoom: 9,
    pitch: 30
});


let clickedCoordinates = [];

map.on('click', function (e) {
  clickedCoordinates = [];
  clickedCoordinates = [e.lngLat.lng, e.lngLat.lat];
  updateDome(clickedCoordinates, 50);
  toggleAudio();
});

map.on('mousemove', (e) => {
  document.getElementById('info').innerHTML =
  // `e.point` is the x, y coordinates of the `mousemove` event
  // relative to the top-left corner of the map.
  JSON.stringify(e.point) +
  '<br />' +
  // `e.lngLat` is the longitude, latitude geographical position of the event.
  JSON.stringify(e.lngLat.wrap());
  });

function updateDome(center, raggio) {
  //console.log(center)
  sendFlightRequest(center[1], center[0], raggio * 1000)
  const options = { steps: 64, units: 'kilometers' };
  var grid = turf.hexGrid(turf.bbox(turf.circle(center, raggio, options)), precision);
  var dome = turf.featureCollection(grid.features.map(function (feature) {
      var point = turf.centroid(feature);
      var distance = turf.distance(center, point);
      if (distance > raggio) {
          return;
      }

      var z = Math.sqrt(Math.pow(raggio, 2) - Math.pow(distance, 2));
      z = isNaN(z) ? 0 : z;

      return turf.feature(feature.geometry, {
          base_height: z * 1000,
          height: (z * 1000) + (distance * 1000 + epsilon) * 0.1
      });
  }).filter(function (feature) {
      return feature;
  }));

  // Remove the existing dome layer if it exists
  if (map.getSource('dome')) {
      map.removeLayer('dome');
      map.removeSource('dome');
  }

  map.addSource('dome', {
      type: 'geojson',
      data: dome
  });

  map.addLayer({
      id: 'dome',
      type: 'fill-extrusion',
      source: 'dome',
      layout: {},
      paint: {
          'fill-extrusion-color': '#ccff15',
          'fill-extrusion-base': {
              type: 'identity',
              property: 'base_height'
          },
          'fill-extrusion-height': {
              type: 'identity',
              property: 'height'
          },
          'fill-extrusion-opacity': 0.5
      }
  });
}
