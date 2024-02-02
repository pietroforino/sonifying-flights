#!/usr/bin/env python3

from FlightRadar24 import FlightRadar24API
import json

fr_api = FlightRadar24API()

lat = 45.4481724
lon = 9.2198226
radius = 50000

bounds = fr_api.get_bounds_by_point(lat, lon, radius)

flights = fr_api.get_flights(bounds = bounds)


flightsDictList = []

for f in flights:
    flightString = str(f)
    # get rid of annoying characters
    flightString = flightString.replace('<', '').replace('>','')

    # split by delimitator
    fieldList = [ a.strip() for a in flightString.split('-')]

    #print( len( fieldList ) )
    if len( fieldList ) == 5:
        # agggreget first an sendon element
        aggregate = fieldList[0] + '-' + fieldList[1]
        #print( fieldList )
        #print( aggregate )
        # get rid of second element
        fieldList.pop(1)
        # and replace first element with aggragate
        fieldList[0] = aggregate
    else:
        # leave as it is
        pass


    dictionary = {
        "flight_id": fieldList[0],
        fieldList[1].split(':')[0].strip(): fieldList[1].split(':')[1].strip(),
        fieldList[2].split(':')[0].strip(): fieldList[2].split(':')[1].strip(),
        fieldList[3].split(':')[0].strip(): fieldList[3].split(':')[1].strip()
    }

    #print( dictionary )
    flightsDictList.append( dictionary )


OUPUT_FILE = "myjson.json"

print( flightsDictList )

with open(OUPUT_FILE, "w") as outfile:
    json.dump(flightsDictList, outfile)
