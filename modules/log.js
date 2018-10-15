const util = require('util');

function out(msg) {
  const date = new Date();
  console.log("[" + date + "] - ", msg);
}

function err(msg) {
  const date = new Date();
  console.error("[" + date + "] - ", msg);
}

function prettyPrint(json) {
  if (typeof(json) === 'object') {
    try {
      json = JSON.parse(json);
    } catch(err) {

    }

    console.log(util.inspect(json, {depth: null, colors: true}));
  } else {
    console.log(json);
  }
}

function alertError(txt) {
  console.log("\x1b[41m\x1b[37m%s\x1b[0m", txt)
}

function alertWarning(txt) {
  console.log("\x1b[43m\x1b[30m%s\x1b[0m", txt)
}

function alertInfo(txt) {
  console.log("\x1b[44m\x1b[37m%s\x1b[0m", txt)
}

module.exports = {
  out,
  err,
  alertError,
  alertWarning,
  alertInfo,
  prettyPrint
}
