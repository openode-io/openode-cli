const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");
var Spinner = require('cli-spinner').Spinner;


function processCommander() {
  commander
    .version('1.0.4');

  commander
    .command('deploy')
    .description('Deploy your website on opeNode')
    //.option("-s, --setup_mode [mode]", "Which setup mode to use")
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await progress(require("./modules/deploy").deploy(envVars));
        log.prettyPrint(result);
      }
    });

  commander
    .command('status')
    .description('Get info on your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await progress(require("./modules/instance_operation")("status", envVars));
        log.prettyPrint(result);
      }
    });

  commander
    .command('stop')
    .description('Stop your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await progress(require("./modules/instance_operation")("stop", envVars));
        log.prettyPrint(result);
      }
    });

  commander
    .command('restart')
    .description('Restart your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await progress(require("./modules/instance_operation")("restart", envVars));
        log.prettyPrint(result);
      }
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

let progressObj = new Spinner('%s ...processing')
progressObj.setSpinnerString(2);

function progressBegin() {
  progressObj.start();
}

function progressEnd() {
  progressObj.stop(true);
}

async function progress(promise) {
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
