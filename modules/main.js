const fs = require("fs");
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

async function prepareAuthenticatedCommand(version) {
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
    envs.version = version;
    envs.files2Ignore = env.extractFiles2Ignore();

    return [envs, socketIo];
  } catch(err) {
    return [{}, ];
  }
}

function terminate() {
  socketIo.disconnect();
}

function checkCurrentRepositoryValid() {
  if ( ! fs.existsSync("./package.json")) {
    console.error("package.json missing. Make sure to be in the right path with a valid package.json file.")
    process.exit()
  }
}

module.exports = {
  isFirstRun,
  prepareAuthenticatedCommand,
  terminate,
  checkCurrentRepositoryValid
};
