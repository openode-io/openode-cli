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
        return await getOp("logs", env.site_name, env);
        break;
      case "stop":
        return await getOp("stop", env.site_name, env);
        break;
      case "restart":
        return await getOp("restart", env.site_name, env, options);
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
      case "addAlias":
        return await postOp("add-alias", env.site_name, options, env);
        break;
      case "delAlias":
        return await postOp("del-alias", env.site_name, options, env);
        break;
      case "eraseAll":
        return await postOp("erase-all", env.site_name, {}, env);
        break;

      case "addLocation":
        return await postOp("add-location", env.site_name, {
          "location": {
            "str_id": options.locationId
          }
        }, env);
        break;
      case "removeLocation":
        return await postOp("remove-location", env.site_name, {
          "location": {
            "str_id": options.locationId
          }
        }, env);
        break;
      case "locations":
        return await getOp("locations", env.site_name, env);
        break;
    }

  } catch(err) {
    return err;
  }
};
