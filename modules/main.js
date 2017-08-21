const env = require("./env");
const auth = require("./auth");
const instance = require("./instance");
const cliConfs = require("./cliConfs");
const socketIo = require('socket.io-client')(cliConfs.API_URL);

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
    envs.io = socketIo;

    return [envs, socketIo];
  } catch(err) {
    return null;
  }
}

function terminate() {
  socketIo.disconnect();
}

module.exports = {
  isFirstRun,
  prepareAuthenticatedCommand,
  terminate
};
