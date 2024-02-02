from FlightRadar24 import FlightRadar24API
from flask import Flask, request, jsonify
from flask_cors import CORS

fr_api = FlightRadar24API()

lat = 45.4481724
lon = 9.2198226
radius = 50000

bounds = fr_api.get_bounds_by_point(lat, lon, radius)

flights = fr_api.get_flights(bounds = bounds)

print("Flying to", flights)


app = Flask(__name__)
cors = CORS(app)

@app.route("/receiver", methods=["POST"])
def postME():
   data = request.get_json()
   data = jsonify(data)
   return data
if __name__ == "__main__": 
   app.run(debug=True)