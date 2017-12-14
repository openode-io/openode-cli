const req = require("./req");
const instanceOperation = require("./instance_operation");
const locationsModule = require("./locations");

async function availableLocations(env) {
  try {
    return await req.get('global/available-locations', env);
  } catch(err) {
    return err;
  }
}

async function leastLoadedLocation(env) {
  try {
    return await req.get('global/least-loaded-location', env);
  } catch(err) {
    return err;
  }
}

async function getLocations(env) {
  return await instanceOperation("locations", env, { } );
}

async function getLocations2Clean(locations2Deploy, env) {
  const locs = await availableLocations(env);

  return locs.filter((location) => {
    return ! locations2Deploy.find((l) => l.id == location.id);
  });
}

async function locations2Process(env, locationId)  {
  try {
    if (locationId) {
      return [locationId];
    }

    return (await getLocations(env)).map((l) => l.id);
  } catch(err) {
    console.error("Unable to process the location " + locationId);
  }

  return [];
}

module.exports = {
  availableLocations,
  getLocations,
  getLocations2Clean,
  locations2Process,
  leastLoadedLocation
};
