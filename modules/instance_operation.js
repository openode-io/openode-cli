const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil");

function getOp(operation, sitename, config, options = {}) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      reject({});
    }

    let url = cliConfs.API_URL + 'instances/' + sitename + "/" + operation + "?";

    const params = Object.keys(options).map(k => k + '=' + options[k]).join("&");
    url += params;

    request.get({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      timeout: 300000,
      json: true,
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
}

function postOp(operation, sitename, form, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      reject({});
    }

    let url = cliConfs.API_URL + 'instances/' + sitename + "/" + operation;

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      timeout: 300000,
      form: form
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
}


module.exports = async function(operation, env, options = {}) {
  try {
    switch(operation) {
      case "status":
        return await getOp("", env.site_name, env);
        break;
      case "logs":
        return await getOp("logs", env.site_name, env, options);
        break;
      case "stop":
        return await postOp("stop", env.site_name, options, env);
        break;
      case "restart":
        return await postOp("restart", env.site_name, options, env);
        break;
      case "deployPreBuilt":
        return await postOp("deploy-pre-built", env.site_name, options, env);
        break;
      case "listAliases":
        let statusResult = await getOp("", env.site_name, env);

        try {
          return JSON.parse(statusResult.domains);
        } catch(err) {
          console.error(err);
          return [];
        }
        break;

      case "cmd":
        return await postOp("cmd", env.site_name, options, env);
        break;

      case "addAlias":
        return await postOp("add-alias", env.site_name, options, env);
        break;
      case "delAlias":
        return await postOp("del-alias", env.site_name, options, env);
        break;
      case "eraseAll":
        return await postOp("erase-all", env.site_name, options, env);
        break;
      case "eraseLogs":
        return await postOp("erase-logs", env.site_name, options, env);
        break;

      case "addLocation":
        return await postOp("add-location", env.site_name, {
          "location_str_id": options.location_str_id
        }, env);
        break;
      case "removeLocation":
        return await postOp("remove-location", env.site_name, {
          "location_str_id": options.location_str_id
        }, env);
        break;

      case "increaseStorage":
        return await postOp("increase-storage", env.site_name, {
          "location_str_id": options.location_str_id,
          "amount_gb": options.amountGB
        }, env);
        break;

      case "decreaseStorage":
        return await postOp("decrease-storage", env.site_name, {
          "location_str_id": options.location_str_id,
          "amount_gb": options.amountGB
        }, env);
        break;

      case "locations":
        return await getOp("locations", env.site_name, env);
        break;


      case "setConfig":
        return await postOp("set-config", env.site_name, {
          "location_str_id": options.location_str_id,
          "variable": options.variable,
          "value": options.value
        }, env);
    }

  } catch(err) {
    return err;
  }
};
