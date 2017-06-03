const fs = require('fs');
const log = require("./log");

function get() {
  try {
    let content = fs.readFileSync('./.openode');

    return JSON.parse(content);
  } catch(err) {
    return {};
  }
};

function set(envs) {
  try {
    fs.writeFileSync("./.openode", JSON.stringify(envs));
  } catch(err) {
    log.err(err);
  }
}

module.exports = {
  get,
  set
};
