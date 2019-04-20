const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
const ciConf = require("./modules/ciConf");
const moduleLocations = require("./modules/locations");
const req = require("./modules/req");
const packageJson = require("./package.json");
const deployModule = require("./modules/deploy");

const ora = require('ora')({
  "color": "red",
  "stream": process.stdout
});

async function runCommand(promisedCmd, options = {}) {
  try {
    let result = await promisedCmd;
    log.prettyPrint(result);

    if ( ! options.keepUntilDeployed) {
      process.exit();
    }
  } catch(err) {
    console.error(err);
    process.exit(1);
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

async function auth(opts) {
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

  return envVars;
}

function processCommander() {
  commander
    .version(packageJson.version);

  commander
    .command('deploy')
    .option("-t <token>", "User token used for authentication")
    .option("-s <site name>", "Instance site name.")
    .description('Deploy your website on opeNode')
    .action(async function(opts) {

      const options = {
      };

      let envVars = await auth(opts);

      await main.checkCurrentRepositoryValid(envVars);

      await runCommand(progress(
        deployModule.deploy(envVars, options)
          .then((result) => {
            return result;
          }), envVars), { keepUntilDeployed: true });
    });

  commander
    .command('restart  [locationId]')
    .description('Restart the instance without synchronizing the files.')
    .action(async function(locationIdInput) {

      let [envVars, ] = await prepareAuth();

      function proc(locationId) {
        return require("./modules/instance_operation")("restart", envVars,
          { "location_str_id": locationId});
      }

      await runCommand(progress(
        processAllLocations(envVars, locationIdInput, proc), envVars),
        { keepUntilDeployed: true }
      );
    });

  commander
    .command('reload')
    .option("-t <token>", "User token used for authentication")
    .option("-s <site name>", "Instance site name.")
    .description('Reload your container instance')
    .action(async function(opts) {

      const options = {
      };

      let envVars = await auth(opts);

      await main.checkCurrentRepositoryValid(envVars);

      function proc(locationId) {
        return require("./modules/instance_operation")("reload", envVars,
          { "location_str_id": locationId});
      }

      await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
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
    .command('sync-n-reload')
    .option("-t <token>", "User token used for authentication")
    .option("-s <site name>", "Instance site name.")
    .description('Sync and then reload your instance')
    .action(async function(opts) {

      let envVars = await auth(opts);

      await main.checkCurrentRepositoryValid(envVars);

      function proc(locationId) {
        return require("./modules/deploy").syncFiles(envVars, { "location_str_id": locationId })
          .then((resultSync) => {

            return require("./modules/instance_operation")("reload", envVars,
              { "location_str_id": locationId}).then((resultReload) => {

                return {
                  sync: resultSync,
                  reload: resultReload
                };
              });
          });
      }

      await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
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

      await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
    });

  commander
    .command('stats')
    .description('Get daily stats about the instance.')
    .action(async function(opts) {
      let [envVars, ] = await prepareAuth();

      await runCommand(progress(
        require("./modules/instanceRequest").getOp("stats", envVars.site_name, envVars)));
    });

  commander
    .command('cmd <service> <myCmd>')
      .description('Execute a command in your container instance')
      .action(async function(service, myCmd) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("cmd", envVars,
            { "location_str_id": locationId, cmd: myCmd, service });
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

  // aliases (custom domain)
  commander
    .command('list-aliases')
    .description('List aliases of the custom domain')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("listAliases", envVars)));
    });

  commander
    .command('add-alias <domainName>')
    .description('Add hostname alias')
    .action(async function(hostname) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("addAlias", envVars, { hostname } )));
    });

  commander
    .command('del-alias <domainName>')
    .description('Delete hostname alias')
    .action(async function(hostname) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("delAlias", envVars, { hostname } )));
    });

  // dns (custom domain)
  commander
    .command('list-dns')
    .description('List DNS configurations for a given domain name')
    .action(async function(domainName) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("listDns", envVars)));
    });

  commander
    .command('add-dns <domainName> <type> <value>')
    .description('Add custom domain name DNS setting')
    .action(async function(domainName, type, value) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("addDns", envVars,
        { domainName, type, value } )));
    });

  commander
    .command('del-dns <id>')
    .description('Add custom domain name DNS setting')
    .action(async function(id) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("delDns", envVars, { id } )));
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

  // snapshots
  commander
    .command('snapshots')
      .description('List all snapshots')
      .action(async function() {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("snapshots", envVars,
          { })));
      });

  commander
    .command('snapshot [id]')
      .description('Get the snapshot details')
      .action(async function(id) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return ;
        }

        await runCommand(progress(require("./modules/instance_operation")("snapshot", envVars,
          { id })));
      });

  commander
    .command('del-snapshot [id]')
      .description('Delete a snapshot')
      .action(async function(id) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("del-snapshot", envVars,
          { id })));
      });

  commander
    .command('create-snapshot <name> [locationId]')
      .description('Create a snapshot of your remote repository')
      .action(async function(name, locationIdInput) {

        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("create-snapshot", envVars,
            { "location_str_id": locationId, name });
        }

        await runCommand(progress(processAllLocations(envVars, locationIdInput, proc)));
      });

  commander
    .command('apply-snapshot <id> [locationId]')
      .description('Copy an existing snapshot to the remote repository')
      .action(async function(id, locationIdInput) {

        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("apply-snapshot", envVars,
            { "location_str_id": locationId, id });
        }

        await runCommand(progress(processAllLocations(envVars, locationIdInput, proc)));
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
    .command('list-templates')
      .description('Currently available templates')
      .action(async function() {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/templates")("list-templates", envVars,
          { } )).then((result) => {
            log.prettyPrint(`*** to show the readme of a template, type 'openode template-info [template name]'`);

            return result;
          }));
      });

  commander
    .command('template-info <template-name>')
      .description('Shows the template readme.')
      .action(async function(name) {
        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/templates")("template-info", envVars,
          { name } )));
      });

  commander
    .command('template [template-name]')
    .option("--with-services <services>", "List of services required")
      .description('Retrieve the template Dockerfile.')
      .action(async function(name, options) {

        let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/templates")("template", envVars,
          { name, withServices: options.withServices } )));
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
    .command('set-cpus <nbCpus> [locationId]')
      .description('Increase the extra storage capacity')
      .action(async function(nbCpus, locationIdInput) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("setCpus", envVars,
            { "location_str_id": locationId, nbCpus } );
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
    .command('config <variable>')
      .description('Get a configuration value')
      .action(async function(variable) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("getConfig", envVars,
          { variable } )));
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

    env.io.on('message', async function(data) {
      if (withProgressLoader) {

        if (data && data.indexOf("deployment-result=") === 0) {
          const partsResult = data.split("deployment-result=");

          if (partsResult && partsResult.length === 2) {
            const result = JSON.parse(partsResult[1]);

            const finalResult = await deployModule.prepareFinalResult([result]);
            log.prettyPrint(finalResult.logs);
            log.prettyPrint(finalResult.result);

            let codeExit = 0;

            if (finalResult.result && finalResult.result.length > 0) {
              if (finalResult.result.find(r => ! r.result || r.result !== 'success')) {
                codeExit = 1;
              }
            }

            // to refactor if we have more than 1 deployment
            process.exit(codeExit);
          }
        } else {
          console.log(data);
        }
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

main.checkOpenodeStatus().then(() => {
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
