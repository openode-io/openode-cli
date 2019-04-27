
const request = require("request");
const cliConfs = require("./cliConfs");
const packageJson = require("../package.json");

function getOp(operation, sitename, config, options = {}) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      reject({});
    }

    let url = cliConfs.getApiUrl() + 'instances/' + sitename + "/" + operation + "?";

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

    let url = cliConfs.getApiUrl() + 'instances/' + sitename + "/" + operation;

    url = `${url}?version=${packageJson.version}`;

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

function delOp(operation, sitename, id, config) {
  return new Promise((resolve, reject) => {

    if (!sitename || sitename == "") {
      reject({});
    }

    let url = cliConfs.getApiUrl() + 'instances/' + sitename + "/" + operation;

    url = `${url}?version=${packageJson.version}&id=${id}`;

    request.delete({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      timeout: 300000
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
}

module.exports = {
  getOp,
  postOp,
  delOp
}
