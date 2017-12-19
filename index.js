const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
const ciConf = require("./modules/ciConf");
const moduleLocations = require("./modules/locations");
const ora = require('ora')({
  "color": "red",
  "stream": process.stdout
});

const version = "1.2.6"

async function runCommand(promisedCmd, options = {}) {
  try {
    let result = await promisedCmd;
    log.prettyPrint(result);

    if (options.keepIo) {
      main.terminate();
    }

    process.exit();
  } catch(err) {
    console.error("Unhandled error, please report this bug:");
    console.error(err);
  }
}

async function prepareAuth() {
  try {
    return await main.prepareAuthenticatedCommand(version);
  } catch(err) {
    return [{}, ];
  }
}

async function processAllLocations(envVars, locationIdInput, callbackProcess) {
  try {
    const locationIds = await moduleLocations.locations2Process(envVars, locationIdInput);
    const results = [];

    for (let locationId of locationIds) {
      try {
        console.log("Processing for " + locationId);
        let resultCurrent = await callbackProcess(locationId);
        resultCurrent.location = locationId;
        results.push(resultCurrent);
      } catch(err) {
        throw new Error(err);
      }
    }

    return results;
  } catch(err) {
    throw new Error("Issue while processing a location");
  }
}

function processCommander() {
  commander
    .version(version);

  commander
    .command('deploy')
    .option("--clearNpm", "Clear node_modules before deploying")
    .option("-t <token>", "User token used for authentication")
    .option("-s <site name>", "Instance site name.")
    .description('Deploy your website on opeNode')
    .action(async function(opts) {
      const options = {
        "clearNpm": opts && opts.clearNpm === true
      };

      let envVars = {};

      if ( ! opts.T) {
        // did not specify token, need to ask it/.openode
        [envVars, ] = await prepareAuth();
      } else {
        envVars.token = opts.T;
        envVars.site_name = opts.S;
        envVars.version = version;
      }

      await runCommand(progress(require("./modules/deploy").deploy(envVars, options), envVars));
    });

  commander
    .command('sync')
    .description('Send the changed/new files to opeNode without deployment')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/deploy").syncFiles(envVars), envVars));
    });

  commander
    .command('pull')
    .description('Pull your website from opeNode to your local disk')
    //.option("-s, --setup_mode [mode]", "Which setup mode to use")
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/deploy").pull(envVars), envVars));
    });

  commander
    .command('ci-conf <token> <sitename>')
    .description('Write the confs for your continuous integration (CI) env')
    .action(async function(token, sitename) {
      ciConf(token, sitename);
      process.exit();
    });

  commander
    .command('status')
    .description('Get info on your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("status", envVars), envVars));
    });

  commander
    .command('logs')
    .description('Print logs in realtime')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(
        progress(require("./modules/instance_operation")("logs", envVars), envVars, false),
        { "keepIo": false }
      );
    });

  commander
    .command('stop')
    .description('Stop your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();

      function procStop(locationId) {
        return require("./modules/instance_operation")("stop", envVars,
          { "location_str_id": locationId });
      }

      await runCommand(progress(processAllLocations(envVars, null, procStop)));
    });

  commander
    .command('restart')
    .description('Restart your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("restart", envVars)));
    });

  // aliases (custom domain)
  commander
    .command('list-aliases')
    .description('List aliases of the custom domain')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("listAliases", envVars)));
    });

  commander
    .command('add-alias <hostname>')
    .description('Add hostname alias')
    .action(async function(hostname) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("addAlias", envVars, { hostname } )));
    });

  commander
    .command('del-alias <hostname>')
    .description('Delete hostname alias')
    .action(async function(hostname) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("delAlias", envVars, { hostname } )));
    });

  commander
    .command('erase-all [locationId]')
    .description('Erase all content in the remote repository')
    .action(async function(locationIdInput) {
      let [envVars, ] = await prepareAuth();


      function procEraseAll(locationId) {
        return require("./modules/instance_operation")("eraseAll", envVars,
          { "location_str_id": locationId });
      }

      await runCommand(progress(processAllLocations(envVars, locationIdInput, procEraseAll)));
    });

  // storage areas
  commander
    .command('storage-areas')
      .description('List the storage areas')
      .action(async function() {
      let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("list", envVars)));
      });

  commander
    .command('add-storage-area <storageArea>')
      .description('Add a new storage area')
      .action(async function(storageArea) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("add", envVars, storageArea)));
      });

  commander
    .command('del-storage-area <storageArea>')
      .description('Delete a storage area')
      .action(async function(storageArea) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("del", envVars, storageArea)));
      });

  // plans
  commander
    .command('plans')
      .description('List the available plans')
      .action(async function() {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/plans")("list", envVars)));
      });

  commander
    .command('plan')
      .description('Show the currently active plan')
      .action(async function() {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/plans")("plan", envVars)));
      });

  commander
    .command('set-plan <plan>')
      .description('Set the currently active plan')
      .action(async function(plan) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/plans")("set", envVars, plan)));
      });

  // locations

  commander
    .command('available-locations')
    .description('List the available locations')
    .action(async function(token, sitename) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(moduleLocations.availableLocations(envVars), envVars));
    });

  commander
    .command('locations')
      .description('Currently active locations')
      .action(async function() {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/instance_operation")("locations", envVars,
          { } )));
      });

  commander
    .command('add-location <locationId>')
      .description('Add a new location')
      .action(async function(locationId) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/instance_operation")("addLocation", envVars,
          { "location_str_id": locationId } )));
      });

  commander
    .command('del-location <locationId>')
      .description('Remove a location')
      .action(async function(locationId) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/instance_operation")("removeLocation", envVars,
          { "location_str_id": locationId } )));
      });

  commander
    .command('*')
    .description('')
    .action(async function() {
      log.err("Invalid command")
      commander.help();
    });

  commander.parse(process.argv);

  if ( ! commander.args.length)
    commander.help();
}

function progressBegin() {
  ora.start("");
}

function progressEnd() {
  //progressObj.stop(true);
  ora.stop();
}

async function progress(promise, env, withProgressLoader = true) {

  if (env && env.io) {
    // join socket io to receive notifications
    env.io.emit('room', env.site_name + "/" + env.token);

    env.io.on('message', function(data) {
      if (withProgressLoader) {
        console.log(data);
      } else {
        process.stdout.write(data)
      }
    });
  }

  if (withProgressLoader)
    progressBegin();

  let result = await promise;

  if (withProgressLoader)
    progressEnd();

  return result;
}

if (main.isFirstRun()) {
  console.log("Welcome to...")
  asciify('opeNode.io', {color: 'white', font: "big"}, function (err, asciiArt) {
    console.log(asciiArt);
    processCommander();
  });
} else {
  processCommander();
}
