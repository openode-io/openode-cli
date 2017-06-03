const env = require("./env");
const auth = require("./auth");

function prepareAuthenticatedCommand() {
  return new Promise((resolve, reject) => {
    let envs = env.get();
    auth(envs).then((token) => {
      envs.token = token;
      env.set(envs);
    }).catch((err) => {
      reject(err);
    });

  })
}

module.exports = {
  prepareAuthenticatedCommand
};
