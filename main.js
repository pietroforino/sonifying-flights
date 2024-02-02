import "./style.css";
import noiseOscProcessorUrl from "./NoiseOscillatorProcessor.js?url";
import saturatorProcessorUrl from "./SaturatorProcessor.js?url";
import { NoiseOscillatorNode } from "./NoiseOscillatorNode";
import WAAClock from "waaclock";
// import "./socket.js";

const SCALE = [60, 62, 64, 65, 67, 69, 71]; // Major
// const SCALE = [57, 59, 60, 62, 64, 65, 67]; // Minor

let audioButton = document.querySelector("#audioButton");
let visContainer = document.querySelector("#vis");

let audioCtx = new AudioContext();
let clock = new WAAClock(audioCtx, { toleranceEarly: 0.1 });
let firstStart = true;
let clockEvents = [];
let energy = 0.5;

function loadBuffer(url) {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buffer) => audioCtx.decodeAudioData(buffer));
}

function mtof(midi) {
  return Math.pow(2, (midi - 69) / 12) * 440;
}

async function startLoop() {
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
}

function playNote(
  {
    time,
    note,
    velocity = 0.15,
    duration = 1.15,
    attack = 0.02,
    decay = 0.1,
    sustain = 0.5,
    release = 5.0,
    type = "triangle",
    delayTime = 0.2,
    delayFeedback = 0.7,
  } = {},
  destination = audioCtx.destination
) {
  // Create
  let osc = audioCtx.createOscillator();
  let noiseOsc = new NoiseOscillatorNode(audioCtx);
  let noiseGain = audioCtx.createGain();
  let gain = audioCtx.createGain();
  let delay = audioCtx.createDelay();
  let delayFeedbackGain = audioCtx.createGain();

  // Configure
  osc.type = type;
  osc.frequency.value = mtof(note);
  noiseGain.gain.value = 0.2;
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(velocity, time + attack);
  gain.gain.linearRampToValueAtTime(velocity * sustain, time + attack + decay);
  gain.gain.setValueAtTime(velocity * sustain, time + duration);
  gain.gain.setTargetAtTime(0, time + duration, release * 0.2);
  delay.delayTime.value = delayTime;
  delayFeedbackGain.gain.value = delayFeedback;

  // Connect
  osc.connect(gain);
  noiseOsc.connect(noiseGain);
  noiseGain.connect(gain);
  gain.connect(destination);
  gain.connect(delay);
  delay.connect(destination);

  // Start
  osc.start(time);
  noiseOsc.start();
  osc.stop(time + duration + release);
  noiseOsc.stop(time + duration + release);
}

function playOneShotBuffer({ time, buffer, gain = 0.5, rate = 1.0 }) {
  // Create
  let bufferSrcNode = audioCtx.createBufferSource();
  let gainNode = audioCtx.createGain();

  // Configure
  bufferSrcNode.buffer = buffer;
  bufferSrcNode.playbackRate.value = rate;
  gainNode.gain.value = gain;

  // Connect
  bufferSrcNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Start
  bufferSrcNode.start(time);
}

function randRange(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

function startMelody(length, octaveShift, destination) {
  let chordNoteIndexes = [0, 2, 4, 6];
  let noteIndex = 0;
  let sequence = [];
  for (let i = 0; i < length; i += 1) {
    if (Math.random() < 0.2) {
      sequence.push(-1);
    } else {
      if (noteIndex === 0) noteIndex += 1;
      else if (noteIndex === chordNoteIndexes.length - 1) noteIndex -= 1;
      else noteIndex += Math.random() < 0.5 ? -1 : 1;
      let note = SCALE[chordNoteIndexes[noteIndex]] + 12 * octaveShift;
      sequence.push(note);
    }
  }

  let seqIndex = 0;
  let event = clock
    .callbackAtTime((event) => {
      let note = sequence[seqIndex++ % sequence.length];
      if (note === -1) return;
      let energyOctaveShift = -1 + Math.floor(energy * 3);
      let timingHumanisation = randRange(0.0, 0.02);
      let delayTimes = [0.4, 0.3, 0.2];
      let delayTime = delayTimes[Math.floor(Math.random() * delayTimes.length)];
      playNote(
        {
          time: event.deadline + timingHumanisation,
          note: note + 12 * energyOctaveShift,
          velocity: randRange(0.03, 0.06),
          duration: randRange(0.05, 0.15),
          attack: randRange(0.01, 0.02),
          decay: 0.0,
          sustain: 1.0,
          release: randRange(0.25, 1.0),
          type: "triangle",
          delayFeedback: 0.5 + energy * 0.4,
          delayTime,
        },
        destination
      );
      visualiseEvent({ time: event.deadline, isSmall: true });
    }, audioCtx.currentTime)
    .repeat(0.1);
  clockEvents.push(event);
}

function visualiseEvent({ time, hue }) {
  let delay = Math.max(0, time - audioCtx.currentTime);
  setTimeout(() => {
    let x = randRange(0, window.innerWidth - 200);
    let y = randRange(0, window.innerHeight - 200);
    let saturation = 80 + energy * 20;
    let lightness = 50 + energy * 30;
    let color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    let eventEl = document.createElement("div");
    eventEl.classList.add("event");
    eventEl.style.left = `${x}px`;
    eventEl.style.top = `${y}px`;
    eventEl.style.backgroundColor = color;
    visContainer.appendChild(eventEl);
    eventEl
      .animate([{ opacity: 0.5 }, { opacity: 0 }], {
        duration: 3000,
        easing: "ease-out",
        fill: "forwards",
      })
      .finished.then(() => eventEl.remove());
  }, delay);
}

function startNoteLoop(note, initialDelay, interval, visHue, noteParams = {}) {
  let event = clock
    .callbackAtTime((event) => {
      let energyOctaveShift = -1 + Math.floor(energy * 3);
      playNote({
        time: event.deadline,
        note: note + 12 * energyOctaveShift,
        delayFeedback: 0,
        ...noteParams,
      });
      visualiseEvent({ time: event.deadline, hue: visHue });
    }, audioCtx.currentTime + initialDelay)
    .repeat(interval);
  clockEvents.push(event);
}

async function startBufferLoop(url, gain, rate, initialDelay, interval) {
  let buffer = await loadBuffer(url);
  let event = clock
    .callbackAtTime(async (event) => {
      playOneShotBuffer({ time: event.deadline, buffer, gain, rate });
      visualiseEvent({ time: event.deadline });
    }, audioCtx.currentTime + initialDelay)
    .repeat(interval);
  clockEvents.push(event);
}

function updateEnergy(value) {
  energy = value;
}

async function startEverything() {
  await audioCtx.resume();
  await audioCtx.audioWorklet.addModule(noiseOscProcessorUrl);
  await audioCtx.audioWorklet.addModule(saturatorProcessorUrl);
  await startLoop();
  let saturator = new AudioWorkletNode(audioCtx, "saturator");
  saturator.connect(audioCtx.destination);
  clock.start();

  let weatherData = await fetch("/weatherdataset.json").then((r) => r.json());
  let tempo = 0.25;

  // Yearly gong
  startBufferLoop(
    "/oneshots/OS_UTP2_C_Harmony_Pluck.mp4",
    0.5,
    1,
    0,
    365 * tempo
  );

  // Seasonal gong
  let seasonStarts = [90, 180, 270, 360];
  for (let s of seasonStarts) {
    startBufferLoop(
      "/oneshots/OS_MNL_C_Percussive_Pluck.mp4",
      0.5,
      1,
      s * tempo,
      365 * tempo
    );
  }

  // Play rainy days
  for (let i = 0; i < weatherData.precipitation.length; i++) {
    if (weatherData.precipitation[i].value > 0) {
      startNoteLoop(SCALE[0], i * tempo, 365 * tempo, 200);
    }
  }

  // Play windy days
  for (let i = 0; i < weatherData.windspeed.length; i++) {
    if (weatherData.windspeed[i].value > 4) {
      startNoteLoop(SCALE[2], i * tempo, 365 * tempo, 100, {
        type: "square",
      });
    }
  }

  // Vary energy based on temperature
  let allTemperatures = weatherData.temperature.map((t) => t.value);
  let minTemperature = Math.min(...allTemperatures);
  let maxTemperature = Math.max(...allTemperatures);
  let day = 0;
  clock
    .callbackAtTime(() => {
      let temperature = weatherData.temperature[day % 365].value;
      let relativeTemperature =
        (temperature - minTemperature) / (maxTemperature - minTemperature);
      updateEnergy(relativeTemperature);
      day++;
    }, audioCtx.currentTime)
    .repeat(tempo)
    .tolerance({ early: 0 });
}


async function toggleAudio() {
  if (firstStart) {
    await startEverything();
    firstStart = false;
  } else if (audioCtx.state === "running") {
    await audioCtx.suspend();
  } else {
    await audioCtx.resume();
  }
  
  sendFlightRequest(49.00, 2.548, 5000)

}


const data = [
  { "lat":"Porsche", "model":"911S" },
  { "long":"Mercedes-Benz", "model":"220SE" },
  { "radius":"Jaguar","model": "Mark VII" }
 ];
 
let flightData

const sendFlightRequest = (lat, long, r) => {
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
          console.log(flightData)
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
/*
const map = new mapboxgl.Map({
  container: 'map', // container ID
  center: [-74.5, 40], // starting position [lng, lat]
  zoom: 9, // starting zoom,
  style : 'mapbox://styles/pietroforino/cls4jzs56003h01r04o83h8hw'
});

map.on('load', () => {
    const points = turf.featureCollection([]);
    
    // add data source to hold our data we want to display
    map.addSource("circleData", {
        type: "geojson",
        data: points
    });
    
    map.addLayer({
        "id": "circleLayer",
        "type": "circle",
        "source": "circleData",
        "paint": {
            "circle-color": "blue",
            "circle-radius": 10, // initial radius, you can adjust this value
            "circle-opacity": 0.6
        }
    });

    // on user click, extract the latitude / longitude, update our data source, and display it on our map
    map.on('click', (clickEvent) => {
        const lngLat = [clickEvent.lngLat.lng, clickEvent.lngLat.lat];
        points.features.push(turf.point(lngLat));
        map.getSource('circleData').setData(points);

        // You can adjust the radius based on your requirements
        const radius = 0.5; // in kilometers, adjust as needed
        const circleFeature = createGeoJSONCircle(lngLat, radius);
        map.getSource('circleData').setData(circleFeature);
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
});
*/

var center = [9, 45];
var radius = 25;
var precision = 0.25;
var epsilon = 0.0001; // small number so that grid cells have some non zero height

var map = new mapboxgl.Map({
    container: 'map',
    style : 'mapbox://styles/pietroforino/cls4jzs56003h01r04o83h8hw',
    center: center,
    zoom: 9,
    pitch: 30
});

map.on('click', function (e) {
  var clickedCoordinates = [e.lngLat.lng, e.lngLat.lat];
  updateDome(clickedCoordinates);
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

function updateDome(center) {
  var grid = turf.hexGrid(turf.bbox(turf.circle(center, radius)), precision);
  var dome = turf.featureCollection(grid.features.map(function (feature) {
      var point = turf.centroid(feature);
      var distance = turf.distance(center, point);
      if (distance > radius) {
          return; // will be filtered out later
      }

      var z = Math.sqrt(Math.pow(radius, 2) - Math.pow(distance, 2));
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
          'fill-extrusion-color': 'red',
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



