const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const prompt = require("prompt");

function tokenValid(token) {
  return new Promise((resolve, reject) => {
    let url = cliConfs.API_URL + 'instances/';

    request.get({
      headers: {
        "x-auth-token": token
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

function loginOrSignup() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        loginOrSignup: {
          description: 'Would you like to [l]ogin or [r]egister a new account?',
          pattern: /^[l,r]$/,
          message: 'Invalid input, please either l to login or r to register.',
          required: true,
          default: "r"
        }
      }
    };

    prompt.start();

    //
    // Get two properties from the user: email, password
    //
    prompt.get(schema, function (err, result) {
      //
      // Log the results.
      //
      console.log('Command-line input received:');
      console.log('  name: ' + result.loginOrSignup);
      if (result.loginOrSignup == "l") {
        console.log("have to login...");
      }
      else if (result.loginOrSignup == "r") {

      } else {

      }
    });

  });
}

module.exports = function(env) {
  return new Promise((resolve, reject) => {
    tokenValid(env.token).then((isValid) => {
      if (isValid) {
        resolve(env.token);
      } else {
        log.err("Invalid token");
        console.log("ohhhhhhhhhhhhhhhhhhh");
        loginOrSignup();
        resolve("");
      }
    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};
