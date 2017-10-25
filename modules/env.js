const fs = require('fs');
const log = require("./log");
const gitignore = require('parse-gitignore');

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

function extractFiles2Ignore(path = "./.openodeignore") {
  const openodeIgnoreFile = path;
  const defaultList2Ignore = [
    ".openode",
    ".openodeignore",
    "node_modules",
    ".git",
    "Dockerfile",
    "openode_scripts"
  ];

  if ( ! fs.existsSync(path)) {
    return defaultList2Ignore;
  }

  try {
    let result = gitignore(openodeIgnoreFile, defaultList2Ignore);

    return result;
  } catch(err) {
    return defaultList2Ignore;
  }
}

module.exports = {
  get,
  set,
  extractFiles2Ignore
};
