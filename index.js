const commander = require('commander');
const main = require('./modules/main');

commander
  .version('1.0.0');

commander
  .command('deploy')
  .description('Deploy your website on opeNode')
  //.option("-s, --setup_mode [mode]", "Which setup mode to use")
  .action(function() {
    main.prepareAuthenticatedCommand();
    //require("./modules/deploy")();
  });

commander.parse(process.argv);

if ( ! commander.args.length)
  commander.help();
