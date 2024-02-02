from FlightRadar24 import FlightRadar24API

fr_api = FlightRadar24API()

lat = 45.4481724
lon = 9.2198226
radius = 50000

bounds = fr_api.get_bounds_by_point(lat, lon, radius)

flights = fr_api.get_flights(bounds = bounds)

print("Flying to", flights)