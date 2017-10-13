const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil");

function sitenameValid(sitename, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      resolve(false);
    }

    let url = cliConfs.API_URL + 'instances/' + sitename + "/";

    request.get({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function createInstance(sitename, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      resolve(false);
    }

    let url = cliConfs.API_URL + 'instances/create';

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      form: {
        "site_name": sitename
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

function sitenames(config) {
  return new Promise((resolve, reject) => {
    let url = cliConfs.API_URL + 'instances/';

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

  let selectedSitename = null;

  while (selectedSitename == null) {
    let sites = await sitenames(env);
    let defaultSitename = "";

    if (sites.length >= 1) {
      defaultSitename = sites[0];
    }

    const schema = {
      properties: {
        sitename: {
          description: 'Type your subdomain sitename (Example: my-site) OR custom domain (mysite.com)',
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

    let siteExists = await sitenameValid(result.sitename, env);

    if (siteExists) {
      log.out("using existing site " + result.sitename)
      return result.sitename;
    } else {
      log.out("creating website...")
      // try to create it!
      let siteCreated = await createInstance(result.sitename, env);

      if (siteCreated) {
        return siteCreated.site_name;
      }
    }

    selectedSitename = null;
  }

  return selectedSitename;
}

module.exports = async function(env) {
  let currentValid = await sitenameValid(env.site_name, env);

  if (currentValid) {
    return env.site_name;
  } else {
    let site_name = await selectExistingOrCreate(env);
    return site_name;
  }
};
