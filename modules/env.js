const fs = require('fs');
const log = require("./log");
const gitignore = require('parse-gitignore');
const pathModule = require("path");

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
  let result = [];

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
    result = defaultList2Ignore;
  } else {
    try {
      result = gitignore(openodeIgnoreFile, defaultList2Ignore).filter((f) => {
        return f.indexOf("/**") === -1;
      });
    } catch(err) {
      result = defaultList2Ignore;
    }
  }

  // normalize:
  result = result.map(r => pathModule.normalize(r));

  return result;
}

module.exports = {
  get,
  set,
  extractFiles2Ignore
};
