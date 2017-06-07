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
  console.log(util.inspect(json, {depth: null, colors: true}));
}

module.exports = {
  out,
  err,
  prettyPrint
}
