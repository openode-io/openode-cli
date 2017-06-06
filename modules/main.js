const env = require("./env");
const auth = require("./auth");
const instance = require("./instance");

async function prepareAuthenticatedCommand() {
  let envs = env.get();
  let token = await auth(envs);
  envs.token = token;
  env.set(envs);

  let site_name = await instance(envs);
  envs.site_name = site_name;
  env.set(envs);

  return envs;
}

module.exports = {
  prepareAuthenticatedCommand
};
