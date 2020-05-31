const apiRequest = require("./req");
const log = require("./log");
const promptUtil = require("./promptUtil");
const instanceRequest = require("./instanceRequest");
const instanceOp = require("./instance_operation");
const modLocations = require("./locations");

async function getWebsite(sitename, config) {
  if (!sitename || sitename == "") {
    return null;
  }

  try {
    return await apiRequest.get(`instances/${sitename}/`, config)
  } catch (_err) {
    // ignoring error
    return null;
  }
}

function createInstance(opts, config) {
  if (!opts.sitename || opts.sitename == "") {
    return resolve(false);
  }
  return apiRequest.post('instances/create', {
    "site_name": opts.sitename,
    "instance_type": opts.instanceType
  }, config)
}

function sitenames(config, instanceType = "server") {
  return apiRequest.get(`instances/?instance_type=${instanceType}`, config)
    .then(function (body) {
      if (!body) return []
      return body.map(site => site.site_name)
    })
}

async function selectExistingOrCreate(env) {
  let instanceType = "server";
  let selectedSitename = null;

  while (selectedSitename == null) {
    let sites = await sitenames(env, instanceType);
    let defaultSitename = "";

    if (sites.length >= 1) {
      defaultSitename = sites[0];
    }

    const schema = {
      properties: {
        sitename: {
          description: 'Type your subdomain sitename (Example: my-site)' +
            instanceType === 'server' ? ' OR custom domain (mysite.com)' : '',
          message: 'Invalid input, please enter a sitename or custom domain.',
          required: true,
          default: defaultSitename
        }
      }
    };

    if (sites.length > 0) {
      console.log('Existing sites:')

      if (console.table) {
        console.table(sites.map(s => {
          return {
            site_name: s
          }
        }));
      } else {
        console.log(JSON.stringify(sites, null, 2))
      }
    }

    let result = await promptUtil.promisifyPrompt(schema);

    let siteExists = await getWebsite(result.sitename, env);

    if (siteExists) {
      log.out("using existing site " + result.sitename);
      return result.sitename;
    } else {
      log.out("creating website...")
      // try to create it!
      let siteCreated = await createInstance({
        sitename: result.sitename,
        instanceType
      }, env);

      if (siteCreated) {
        return siteCreated.site_name;
      }
    }

    selectedSitename = null;
  }

  return selectedSitename;
}

async function selectLocation(env, allLocations) {

  let selectedLocation = null;

  while (!selectedLocation) {
    let defaultLocation = allLocations[0].id;

    const schema = {
      properties: {
        location: {
          description: 'Select a location (type the id)',
          message: 'Invalid input, please enter a valid location.',
          required: true,
          default: defaultLocation
        }
      }
    };

    if (allLocations.length > 0) {
      console.log("-----------------------------------------");
      console.log(allLocations);
      console.log("Select a location")
    }

    let result = await promptUtil.promisifyPrompt(schema);

    let locationValid = allLocations.find(l => [l.id, l.str_id].includes(result.location));

    if (!locationValid) {
      log.out("Invalid location");
    } else {
      log.out("adding location...")

      // try to create it!
      const resultAddLocation =
        await instanceOp("addLocation", env, {
          "location_str_id": result.location
        });

      if (resultAddLocation && resultAddLocation.error) {
        log.out(resultAddLocation);
      }

      selectedLocation = resultAddLocation.result === 'success' ?
        result.location :
        null;
    }
  }

  return selectedLocation;
}

async function selectPlan(env, locationId, allPlans) {

  let selectedPlan = null;


  while (selectedPlan == null) {
    let defaultPlan = allPlans[0].id;

    const schema = {
      properties: {
        plan: {
          description: 'Select a plan (type the id)',
          message: 'Invalid input, please enter a valid plan.',
          required: true,
          default: defaultPlan
        }
      }
    };

    if (allPlans.length > 0) {
      console.log("-----------------------------------------");
      console.log(allPlans);
      console.log("Select a plan");
    }

    let result = await promptUtil.promisifyPrompt(schema);

    let planValid = allPlans.find(l => l.id === result.plan);

    if (!planValid) {
      log.out("Invalid plan");
    } else {
      log.out("setting plan...");

      // try to create it!
      await instanceOp("set-plan", env, {
        location_str_id: locationId,
        plan: result.plan
      });

      selectedPlan = result.plan;
    }
  }

  return selectedPlan;
}

async function getLocations(sitename, env) {
  return await instanceRequest.getOp("locations", sitename, env, {});
}

module.exports = async function (env, dontPromptLocationPlan) {
  // first check if it has a sitename
  let website = await getWebsite(env.site_name, env);

  if (!website) {
    let site_name = await selectExistingOrCreate(env);
    website = await getWebsite(site_name, env);
  }

  env.site_name = website.site_name;

  if (!dontPromptLocationPlan) {
    // second: the location
    const locations = await getLocations(env.site_name, env);
    let locationId = null;

    if (!locations || locations.length === 0) {
      const allLocations = await modLocations.availableLocations(env, website.type);

      locationId = await selectLocation(env, allLocations);
    } else {
      locationId = locations[0].id;
    }

    // third: the plan
    const plan = await instanceOp("plan", env, {
      "location_str_id": locationId
    });

    if (!plan) {
      const availPlans = await instanceOp("plans", env, {
        "location_str_id": locationId
      });
      await selectPlan(env, locationId, availPlans);
    }
  }

  return {
    site_name: website.site_name,
    instance_type: website.instance_type,
  }
};