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

function files2Ignore(path = "./.openodeignore", defaultList2Ignore = []) {
  let result = [];

  const openodeIgnoreFile = path;

  if ( ! fs.existsSync(path)) {
    result = defaultList2Ignore;
  } else {
    try {
      result = gitignore(openodeIgnoreFile, defaultList2Ignore).map((f) => {
        return f.replace(/\/\*\*/g, "")
          .replace(/\/\*/g, "");
      });
    } catch(err) {
      result = defaultList2Ignore;
    }
  }

  // normalize:
  result = result.map(r => pathModule.normalize(r));

  return result;
}

function extractFiles2Ignore(path = "./.openodeignore") {
  return files2Ignore(path, [
    ".openode",
    ".openodeignore",
    "node_modules",
    ".git",
    "openode_scripts"
  ]);
}

module.exports = {
  get,
  set,
  extractFiles2Ignore,
  files2Ignore
};
