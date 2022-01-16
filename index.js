const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
const ciConf = require("./modules/ciConf");
const envModule = require("./modules/env");
const moduleLocations = require("./modules/locations");
const apiRequest = require("./modules/req");
const instanceRequest = require("./modules/instanceRequest");
const packageJson = require("./package.json");
const deployModule = require("./modules/deploy");
const eventsStream = require("./modules/eventsStream");

const ora = require('ora')({
  "color": "red",
  "stream": process.stdout
});

async function runCommand(promisedCmd, options = {}) {
  try {
    let result = await promisedCmd;

    if (options && ! options.avoidPrinting) {
      log.prettyPrint(result);
    }

    if ( ! options.keepUntilDeployed) {
      process.exit();
    }
  } catch(err) {
    console.log(`run command err`)
    console.error(err);
    process.exit(1);
  }
}

async function prepareAuth(envs = null, dontPromptLocationPlan = false) {
  try {
    const res = await main.prepareAuthenticatedCommand(packageJson.version, envs, dontPromptLocationPlan);

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

        if (resultCurrent) {
          resultCurrent.location = locationId;
          results.push(resultCurrent);
        }

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

  if ( ! opts.T && !opts.t) {
    // did not specify token, need to ask it/.openode
    [envVars, ] = await prepareAuth();
  } else {
    envVars.token = opts.t || opts.T;
    envVars.site_name = opts.s || opts.S;
    envVars.version = packageJson.version;
    await prepareAuth(envVars);
  }

  return envVars;
}

function processCommander() {
  commander
    .version(packageJson.version);

  commander
    .command('login')
    .description('Force login to your account.')
    .action(async function() {

      envModule.set({});

      await prepareAuth();

      process.exit();
    });

  commander
    .command('deploy [repository_url]')
    .option("-t <token>", "User token used for authentication")
    .option("-s <site name>", "Instance site name.")
    .description('Deploy your website on opeNode')
    .action(async function(repositoryUrl, opts) {

      const options = {
        repository_url: repositoryUrl
      };

      let envVars = await auth(opts);

      if (!repositoryUrl) {
        await main.checkCurrentRepositoryValid(envVars);
      }

      await deployModule.verifyServerAllocated(envVars);

      await runCommand(progress(
        deployModule.deploy(envVars, options)
          .then((result) => {
            return eventsStream.deploymentStream(result, envVars.token)
          }), envVars), { keepUntilDeployed: true });
    });

  commander
    .command('restart')
    .option("-l <locationId>", "Location ID.")
    .option("--with-latest-deployment",
            "Use the latest available image to spawn the instance.")
    .description('Restart the instance without synchronizing the files.')
    .action(async function(opts = {}) {
      const locationIdInput = opts.L || opts.l
      const withLatestDeployment = opts.withLatestDeployment

      let [envVars, ] = await prepareAuth();

      function proc(locationId) {
        return require("./modules/instance_operation")("restart", envVars,
          { "location_str_id": locationId, withLatestDeployment })
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
      let envVars = await auth(opts);

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
    .command('ci-conf <token> <sitename>')
    .description('Write the confs for your continuous integration (CI) env')
    .action(async function(token, sitename) {
      ciConf(token, sitename);
      process.exit();
    });

  commander
    .command('change-instance [sitename]')
    .aliases(['switch','change'])
    .description('Change the currently active instance.')
    .action(async function(sitename) {
      const currentEnv = envModule.get();

      if (sitename) {
        currentEnv.site_name = sitename;
      } else {
        // remove the site_name
        delete currentEnv.site_name;
      }

      envModule.set(currentEnv);
      await prepareAuth();

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
    .command('stats')
    .description('Get stats on your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("stats", envVars), envVars));
    });

  commander
    .command('logs')
    .option("-n <nb-lines>", "Number of lines")
    .option("-a <app-name>", "Application name, default=www, or addon name")
    .description('Print latest logs')
    .action(async function(opts) {
      let [envVars, ] = await prepareAuth();
      const nbLines = opts.N || opts.n;
      const app = opts.A || opts.a || 'www';

      function proc(locationId) {
        return require("./modules/instance_operation")("logs", envVars,
          {
            "location_str_id": locationId,
            nbLines: nbLines || 100,
            app,
          }
        );
      }

      await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
    });

  commander
    .command('exec <myCmd>')
      .option("-a <app-name>", "Application name, default=www, or addon name")
      .description('Execute a command in your container instance')
      .action(async function(myCmd, opts = {}) {
        let [envVars, ] = await prepareAuth();
        const app = opts.A || opts.a || 'www';

        function proc(locationId) {
          return require("./modules/instance_operation")("cmd", envVars,
            {
              "location_str_id": locationId,
              cmd: myCmd,
              app,
              service: ''
            })
          .then((result) => {
            if (result && result.result) {
              log.printCmdDetails(result.result);

              if ( ! [undefined, null].includes(result.result.exit_code)) {
                process.exit(result.result.exit_code);
              }
            }
            return null;
          });
        }

        await runCommand(progress(processAllLocations(envVars, null, proc), envVars), {
          avoidPrinting: true
        });
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

  // snapshots
  commander
    .command('create-snapshot [path]')
      .description('Create a snapshot.')
      .action(async function(path) {
        let [envVars, ] = await prepareAuth();

        path = path || '/'

        await runCommand(progress(
          instanceRequest.postOp('snapshots', envVars.site_name, { path }, envVars)
        ));
      });

  // plans
  commander
    .command('plans')
      .description('List the available plans')
      .action(async function() {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("plans", envVars,
            { "location_str_id": locationId });
        }

        await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
      });

  commander
    .command('plan')
      .description('Show the currently active plan')
      .action(async function() {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("plan", envVars,
            { "location_str_id": locationId });
        }

        await runCommand(progress(processAllLocations(envVars, null, proc), envVars));

      });

  commander
    .command('set-plan <plan>')
      .description('Set the currently active plan')
      .action(async function(plan) {
        let [envVars, ] = await prepareAuth();

        function proc(locationId) {
          return require("./modules/instance_operation")("set-plan", envVars,
            { "location_str_id": locationId, plan });
        }

        await runCommand(progress(processAllLocations(envVars, null, proc), envVars));
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
        let [envVars, ] = await prepareAuth(null, true);

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

  // templates

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
      .description('Retrieve the template Dockerfile.')
      .action(async function(name, options) {

        await runCommand(progress(require("./modules/templates")("template", {},
          { name } )));
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
    .command('env')
      .description('Retrieve the stored environment variables')
      .action(async function(variable, value) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("env", envVars)));
      });

  commander
    .command('set-env <variable> <value>')
      .description('Set an environment variable')
      .action(async function(variable, value) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("setEnv", envVars,
          { variable, value } )));
      });

  commander
    .command('del-env <variable>')
      .description('Set an environment variable')
      .action(async function(variable) {
        let [envVars, ] = await prepareAuth();

        await runCommand(progress(require("./modules/instance_operation")("delEnv", envVars,
          { variable } )));
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
        await runCommand(progress(apiRequest.get('global/available-configs', envVars)));
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
  if (withProgressLoader)
    progressBegin();

  let result = await promise;

  if (withProgressLoader)
    progressEnd();

  return result;
}

main.checkOpenodeStatus({ version: packageJson.version }).then(() => {
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
