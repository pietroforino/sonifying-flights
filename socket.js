

const cars = [
 { "make":"Porsche", "model":"911S" },
 { "make":"Mercedes-Benz", "model":"220SE" },
 { "make":"Jaguar","model": "Mark VII" }
];

let flightData

fetch("http://127.0.0.1:5000/receiver", 
    {
        method: 'POST',
        headers: { 
            'Content-type': 'application/json',
            'Accept': 'application/json'
        },

    body:JSON.stringify(cars)}).then(res=>{
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

// import { FlightRadar24API } from "flightradarapi";
// const frApi = new FlightRadar24API();

// const lat = 45.4481724
// const lon = 9.2198226
// const radius = 50000

// let bounds = frApi.getBoundsByPoint(lat, lon, radius);

// let flights

// async function loadFlights() {
//     flights = frApi.getFlights(null, bounds);
//     console.log(flights)
// }

// await loadFlights()

