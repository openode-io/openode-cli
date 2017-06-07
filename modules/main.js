const env = require("./env");
const auth = require("./auth");
const instance = require("./instance");

function isFirstRun() {
  try {
    let envs = env.get();

    return JSON.stringify(envs) == "{}"
  } catch(err) {
    return false;
  }
}

async function prepareAuthenticatedCommand() {
  try {
    let envs = env.get();
    env.set(envs);
    let token = await auth(envs);
    envs.token = token;
    env.set(envs);

    let site_name = await instance(envs);
    envs.site_name = site_name;
    env.set(envs);

    return envs;
  } catch(err) {
    return null;
  }
}

module.exports = {
  isFirstRun,
  prepareAuthenticatedCommand
};
