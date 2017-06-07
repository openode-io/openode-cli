const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil");

function getOp(operation, sitename, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      reject({});
    }

    let url = cliConfs.API_URL + 'instances/' + sitename + "/" + operation;

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

module.exports = async function(operation, env) {
  //let currentValid = await sitenameValid(env.site_name, env);
  try {
    switch(operation) {
      case "status":
        return await getOp("", env.site_name, env);
        break;
      case "stop":
        return await getOp("stop", env.site_name, env);
        break;
      case "restart":
        return await getOp("restart", env.site_name, env);
        break;
    }

  } catch(err) {
    return err;
  }
};
