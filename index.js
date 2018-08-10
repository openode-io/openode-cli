const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
const ciConf = require("./modules/ciConf");
const moduleLocations = require("./modules/locations");
const req = require("./modules/req");
const packageJson = require("./package.json")

const ora = require('ora')({
  "color": "red",
  "stream": process.stdout
});

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
    process.exit();
  }
}

async function prepareAuth(envs = null) {
  try {
    const res = await main.prepareAuthenticatedCommand(packageJson.version, envs);

    // make sure at the beginning it is clean
    await main.beginEndCleanup(res)

    process.on('SIGINT', async function() {
      await main.beginEndCleanup(res); // ctrl+c -> clean
      process.exit();
    });

    return res
  } catch(err) {
    return [{}, ];
  }
}

async function processAllLocations(envVars, locationIdInput, callbackProcess, maxNbLocations = null) {
  try {
    const locationIds = await moduleLocations.locations2Process(envVars, locationIdInput);
    const results = [];

    for (let locationId of locationIds) {
      try {
        console.log("Processing for " + locationId);
        let resultCurrent = await callbackProcess(locationId);
        resultCurrent.location = locationId;
        results.push(resultCurrent);

        if (maxNbLocations && maxNbLocations >= results.length) {
          break;
        }
      } catch(err) {
        throw err;
      }
    }

    return results;
  } catch(err) {
    if (err) {
      throw err;
    } else {
      throw new Error("Issue while processing a location");
    }
  }
}

function processCommander() {
  commander
    .version(packageJson.version);

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
        envVars.version = packageJson.version;
        await prepareAuth(envVars);
      }

      if (envVars.instance_type === 'server') {
        main.checkCurrentRepositoryValid();
      }

      await runCommand(progress(
        require("./modules/deploy").deploy(envVars, options)
          .then((result) => {
            return new Promise((resolve) => {
              if (result && result.find(r => r && r.result && r.result.isFirstUp)) {
                asciify('Now online!', {color: 'green', font: "big"}, function (err, asciiArt) {
                  console.log(asciiArt);
                  
                  result.forEach(r => {
                    if (r && r.result) {
                      delete r.result.isFirstUp;
                    }
                  })

                  resolve(result)
                });
              } else {
                resolve(result)
              }
            });
          }), envVars));
    });

  commander
    .command('sync [locationId]')
    .description('Send the changed/new files to opeNode without deployment')
    .action(async function(locationIdInput) {
      let [envVars, ] = await prepareAuth();

      function proc(locationId) {
        return require("./modules/deploy").syncFiles(envVars, { "location_str_id": locationId });
      }

      await runCommand(progress(processAllLocations(envVars, locationIdInput, proc)));
    });

  commander
    .command('pull [locationId]')
    .description('Pull your website from opeNode to your local disk')
    //.option("-s, --setup_mode [mode]", "Which setup mode to use")
    .action(async function(locationIdInput) {
      let [envVars, ] = await prepareAuth();

      function proc(locationId) {
        return require("./modules/deploy").pull(envVars, { "location_str_id": locationId });
      }

      await runCommand(progress(processAllLocations(envVars, locationIdInput, proc, 1)));
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
    .option("-n <nb-lines>", "Number of lines")
    .description('Print logs in realtime')
    .action(async function(opts) {
      let [envVars, ] = await prepareAuth();
      let nbLines = opts.N;

      function proc(locationId) {
        return require("./modules/instance_operation")("logs", envVars,
          { "location_str_id": locationId, nbLines }
        );
      }

      await runCommand(progress(processAllLocations(envVars, null, proc), envVars, false),
      { "keepIo": false });
    });

  commander
    .command('cmd <myCmd>')
      .description('Execute a command in your container instance')
      .action(async function(myCmd) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("cmd", envVars,
            { "location_str_id": locationId, cmd: myCmd });
        }

        await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
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

      function proc(locationId) {
        return require("./modules/instance_operation")("restart", envVars,
          { "location_str_id": locationId });
      }

      await runCommand(progress(processAllLocations(envVars, null, proc)));
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

  commander
    .command('erase-logs [locationId]')
    .description('Erase the logs in the remote repository')
    .action(async function(locationIdInput) {
      let [envVars, ] = await prepareAuth();


      function procEraseAll(locationId) {
        return require("./modules/instance_operation")("eraseLogs", envVars,
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
    .command('increase-storage <amountGB> [locationId]')
      .description('Increase the extra storage capacity')
      .action(async function(amountGB, locationIdInput) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("increaseStorage", envVars,
            { "location_str_id": locationId, amountGB } );
        }

        await runCommand(progress(processAllLocations(envVars, locationIdInput, proc)));
      });
  commander
    .command('decrease-storage <amountGB> [locationId]')
      .description('Decrease the extra storage capacity')
      .action(async function(amountGB, locationIdInput) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("decreaseStorage", envVars,
            { "location_str_id": locationId, amountGB } );
        }

        await runCommand(progress(processAllLocations(envVars, locationIdInput, proc)));
      });
  commander
    .command('set-config <variable> <value>')
      .description('Set a website configuration')
      .action(async function(variable, value) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("setConfig", envVars,
          { variable, value } )));
      });
  commander
    .command('available-configs')
      .description('List the available configs (used by set-config)')
      .action(async function() {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(req.get('global/available-configs', envVars)));
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

main.checkSomeOpenodeServicesDown().then(() => {
  if (main.isFirstRun()) {
    console.log("Welcome to...")
    asciify('opeNode.io', {color: 'white', font: "big"}, function (err, asciiArt) {
      console.log(asciiArt);
      processCommander();
    });
  } else {
    processCommander();
  }
});
