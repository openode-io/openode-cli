const commander = require('commander');
const main = require('./modules/main');
const asciify = require("asciify");
const log = require("./modules/log");

function processCommander() {
  commander
    .version('1.0.0');

  commander
    .command('deploy')
    .description('Deploy your website on opeNode')
    //.option("-s, --setup_mode [mode]", "Which setup mode to use")
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await require("./modules/deploy").deploy(envVars);
        log.prettyPrint(result);
      }
    });

  commander
    .command('status')
    .description('Get info on your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await require("./modules/instance_operation")("status", envVars);
        log.prettyPrint(result);
      }
    });

  commander
    .command('stop')
    .description('Stop your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await require("./modules/instance_operation")("stop", envVars);
        log.prettyPrint(result);
      }
    });

  commander
    .command('restart')
    .description('Restart your opeNode instance')
    .action(async function() {
      let envVars = await main.prepareAuthenticatedCommand();

      if (envVars) {
        let result = await require("./modules/instance_operation")("restart", envVars);
        log.prettyPrint(result);
      }
    });

  commander.parse(process.argv);

  if ( ! commander.args.length)
    commander.help();
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
