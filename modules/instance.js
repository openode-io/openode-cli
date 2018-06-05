const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil");

function getWebsite(sitename, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      resolve(null);
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

    let url = cliConfs.API_URL + 'instances/create';

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
    let url = `${cliConfs.API_URL}instances/?instance_type=${instanceType}`;

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

async function promptInstanceType() {
  while (true) {
    const schema = {
      properties: {
        instanceType: {
          description: 'Instance type, [S]erver or Server[L]ess',
          message: 'Invalid input, please enter either S for Server or L for Serverless.',
          required: true,
          default: "S"
        }
      }
    };

    let result = await promptUtil.promisifyPrompt(schema);

    if (["s", "l"].includes(result.instanceType.toLowerCase())) {
      const finalInstanceType = { "s": "server", "l": "serverless"}[result.instanceType.toLowerCase()];

      return finalInstanceType;
    }
  }
}

async function selectExistingOrCreate(env) {

  let instanceType = await promptInstanceType();

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

    if (result.sitename.includes(".") && instanceType === 'serverless') {
      log.out("serverless instances can't be a custom domain currently.");
      continue;
    }

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

module.exports = async function(env) {
  let website = await getWebsite(env.site_name, env);

  if ( ! website) {
    let site_name = await selectExistingOrCreate(env);
    website = await getWebsite(site_name, env);
  }

  return {
    site_name: website.site_name,
    instance_type: website.instance_type,
  }
};
