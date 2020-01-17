const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil");
const instanceRequest = require("./instanceRequest");
const instanceOp = require("./instance_operation");
const modLocations = require("./locations");

function getWebsite(sitename, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      resolve(null);
    }

    let url = cliConfs.getApiUrl() + 'instances/' + sitename + "/";

    request.get({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        resolve(null);
      } else {
        resolve(body);
      }
    });
  });
}

function createInstance(opts, config) {
  return new Promise((resolve, reject) => {

    if ( ! opts.sitename || opts.sitename == "") {
      resolve(false);
    }

    let url = cliConfs.getApiUrl() + 'instances/create';

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      form: {
        "site_name": opts.sitename,
        "instance_type": opts.instanceType
      }
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        log.err(body); // show error
        resolve(null);
      } else {
        resolve(body); // returns the created website info
      }
    });
  });
}

function sitenames(config, instanceType = "server") {
  return new Promise((resolve, reject) => {
    let url = `${cliConfs.getApiUrl()}instances/?instance_type=${instanceType}`;

    request.get({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        resolve([]);
      } else {
        try {
          resolve(body.map(site => site.site_name));
        } catch (err) {
          log.err(err);
          resolve([]);
        }

      }
    });
  });
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
      console.log("-----------------------------------------");
      console.log("Your existing sites are: " + sites)
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

  while ( ! selectedLocation) {
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

    if ( ! locationValid) {
      log.out("Invalid location");
    } else {
      log.out("adding location...")

      // try to create it!
      const resultAddLocation =
        await instanceOp("addLocation", env, { "location_str_id": result.location } );

      if (resultAddLocation && resultAddLocation.error) {
        log.out(resultAddLocation);
      }

      selectedLocation = resultAddLocation.result === 'success'
        ? result.location
        : null;
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

    if ( ! planValid) {
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

module.exports = async function(env, dontPromptLocationPlan) {
  // first check if it has a sitename
  let website = await getWebsite(env.site_name, env);

  if ( ! website) {
    let site_name = await selectExistingOrCreate(env);
    website = await getWebsite(site_name, env);
  }

  env.site_name = website.site_name;

  if ( ! dontPromptLocationPlan) {
    // second: the location
    const locations = await getLocations(env.site_name, env);
    let locationId = null;

    if ( ! locations || locations.length === 0) {
      const allLocations = await modLocations.availableLocations(env, website.type);

      locationId = await selectLocation(env, allLocations);
    } else {
      locationId = locations[0].id;
    }

    // third: the plan
    const plan = await instanceOp("plan", env, { "location_str_id": locationId });

    if ( ! plan) {
      const availPlans = await instanceOp("plans", env, { "location_str_id": locationId });
      await selectPlan(env, locationId, availPlans);
    }
  }

  return {
    site_name: website.site_name,
    instance_type: website.instance_type,
  }
};
