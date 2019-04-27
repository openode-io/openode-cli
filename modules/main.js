const fs = require("fs");
const env = require("./env");
const auth = require("./auth");
const req = require("./req");
const log = require("./log");
const instance = require("./instance");
const deploy = require("./deploy");
const cliConfs = require("./cliConfs");
let socketIo = null;
const compareVersion = require("compare-version");

function isFirstRun() {
  try {
    let envs = env.get();

    return JSON.stringify(envs) == "{}"
  } catch(err) {
    return false;
  }
}

async function verifyNewVersion(versionClient) {
  const versionApi = await getApiVersion();

  if (versionApi && compareVersion(versionClient, versionApi) === -1) {
    log.prettyPrint(`** WARNING! A new version of this CLI is available: \n` +
      ` - Your Version: ${versionClient}\n - Available Version: ${versionApi} \n\n` +
      ` Make sure to upgrade by running: npm install -g openode\n\n`);
  }
}

async function prepareAuthenticatedCommand(version, forceEnvs = null) {
  try {

    await cliConfs.determineClosestEndpoint();

    socketIo = require('socket.io-client')(cliConfs.getApiUrl())

    let envs = forceEnvs ? forceEnvs : env.get();
    env.set(envs);
    let token = await auth(envs);
    envs.token = token;
    env.set(envs);

    let opts = await instance(envs);
    envs.site_name = opts.site_name;
    envs.instance_type = opts.instance_type;
    env.set(envs);

    envs.io = socketIo;
    envs.version = version;
    envs.files2Ignore = env.extractFiles2Ignore();

    await verifyNewVersion(version);

    return [envs, socketIo];
  } catch(err) {
    return [{}, ];
  }
}

function terminate() {
  if (socketIo) {
    socketIo.disconnect();
  }
}

async function checkCurrentRepositoryValid(envVars) {
  if ( ! fs.existsSync("./Dockerfile")) {
    log.prettyPrint('*** No Dockerfile found, generating one automatically, please double check your Dockerfile.')
    const result = await require("./templates")("template", envVars, { name: null } )

    // means that we are getting the list of templates
    if (result.length) {
      log.prettyPrint('*** Could not apply a template automatically. Please see the list of templates below. To use one, type openode template [the template name]')
      log.prettyPrint(result)
      process.exit(1)
    }

    log.prettyPrint(result)
  }
}

function checkGlobalNotice() {
  return new Promise((resolve) => {
    req.get('global/settings', {}).then((result) => {
      if (result && result.global_msg) {
        switch(result.global_msg_class) {
          case "alert-danger":
            log.alertError(`** ${result.global_msg} **`);
            break;
          case "alert-warning":
            log.alertWarning(`** ${result.global_msg} **`);
            break;
          case "alert-info":
            log.alertInfo(`** ${result.global_msg} **`);
            break;
        }
      }

      resolve();
    }).catch((err) => {

      resolve()
    });
  });
}

function getApiVersion() {
  return new Promise((resolve) => {
    req.get('global/version', {}).then((result) => {

      resolve(result.version);
    }).catch((err) => {

      resolve(null)
    });
  });
}


function checkSomeOpenodeServicesDown() {
  return new Promise((resolve) => {
    req.get('global/services/down', {}).then((result) => {

      if (result && result.length && result.length > 0) {
        console.log("**********");
        console.log("*** One are many services are currently down! See below.");
        log.prettyPrint(result);
        console.log("**********\n");
      }

      resolve();
    }).catch((err) => {

      resolve()
    });
  });
}

async function checkOpenodeStatus() {
  await checkGlobalNotice();
  await checkSomeOpenodeServicesDown();
}

function beginEndCleanup(authConfig) {
  return deploy.deleteLocalArchive(authConfig[0]);
}

module.exports = {
  isFirstRun,
  prepareAuthenticatedCommand,
  terminate,
  checkCurrentRepositoryValid,
  checkOpenodeStatus,
  beginEndCleanup
};
