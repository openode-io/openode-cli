const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
//var Spinner = require('cli-spinner').Spinner;
const ora = require('ora')({
  "color": "red",
  "stream": process.stdout
});

const version = "1.1.5"

async function runCommand(promisedCmd) {
  try {
    let result = await promisedCmd;
    log.prettyPrint(result);
    main.terminate();
  } catch(err) {
    console.error("Unhandled error, please report this bug:");
    console.error(err);
  }
}

function prepareAuth() {
  return main.prepareAuthenticatedCommand(version);
}

function processCommander() {
  commander
    .version(version);

  commander
    .command('deploy')
    .option("--clearNpm", "Clear node_modules before deploying")
    .description('Deploy your website on opeNode')
    .action(async function(opts) {
      const options = {
        "clearNpm": opts.clearNpm === true
      };
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/deploy").deploy(envVars), envVars, options));
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
    .command('status')
    .description('Get info on your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("status", envVars), envVars));
    });

  commander
    .command('stop')
    .description('Stop your opeNode instance')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("stop", envVars)));
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
      await runCommand(progress(require("./modules/instance_operation")("addAlias", envVars, hostname)));
    });

  commander
    .command('del-alias <hostname>')
    .description('Delete hostname alias')
    .action(async function(hostname) {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("delAlias", envVars, hostname)));
    });

  commander
    .command('erase-all')
    .description('Erase all content in the remote repository')
    .action(async function() {
      let [envVars, ] = await prepareAuth();
      await runCommand(progress(require("./modules/instance_operation")("eraseAll", envVars), envVars));
    });

  // storage areas
  commander
    .command('storage-areas')
      .description('List the storage areas')
      //.option("-s, --setup_mode [mode]", "Which setup mode to use")
      .action(async function() {
      let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("list", envVars)));
      });

  commander
    .command('add-storage-area <storageArea>')
      .description('Add a new storage area')
      //.option("-s, --setup_mode [mode]", "Which setup mode to use")
      .action(async function(storageArea) {
      let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("add", envVars, storageArea)));
      });

  commander
    .command('del-storage-area <storageArea>')
      .description('Delete a storage area')
      //.option("-s, --setup_mode [mode]", "Which setup mode to use")
      .action(async function(storageArea) {
      let [envVars, ] = await prepareAuth();
        await runCommand(progress(require("./modules/storageAreas")("del", envVars, storageArea)));
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
  ora.start("processing...");
}

function progressEnd() {
  //progressObj.stop(true);
  ora.stop();
}

async function progress(promise, env) {

  if (env && env.io) {
    // join socket io to receive notifications
    env.io.emit('room', env.site_name + "/" + env.token);

    env.io.on('message', function(data) {
      console.log(data);
    });
  }

  progressBegin();
  let result = await promise;
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
