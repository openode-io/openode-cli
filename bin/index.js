#!/usr/bin/env node

'use strict';
const compareVersion = require("compare-version");

var version = process.version.replace("v", "");

if (compareVersion(version, "7.6.0") == -1) {
  console.error("openode: Please install node >= 7.6.0. If you have NVM, you can run \"nvm install 7.6.0\". \nYour current version is: " + version + ".");
} else {
  require("../index");
}
