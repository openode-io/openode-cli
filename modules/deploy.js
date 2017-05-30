const fs = require("fs");

function iterateDir(dir) {
  const files = fs.readdirSync(dir);

  for (let f of files) {
    console.log("f = " + f);
    console.log(fs.lstatSync(dir + f));
  }
}

module.exports = function deploy() {
  console.log("im deploying!!!");
  iterateDir("./");
};
