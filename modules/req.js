const cliConfs = require("./cliConfs");
const request = require("request");

function get(path, config) {
  return new Promise((resolve, reject) => {
    let url = cliConfs.API_URL + path;

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

function post(path, params, config) {
  return new Promise((resolve, reject) => {
    let url = cliConfs.API_URL + path;

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      form: params
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
  get,
  post
};
