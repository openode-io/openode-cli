const fs = require("fs");

function localFilesListing(dir) {
  const files = fs.readdirSync(dir);
  let allFiles = [];

  for (let f of files) {
    let fInfo = {};
    fInfo.path = dir + "/" + f;

    const fStat = fs.lstatSync(fInfo.path);


    if ((f == "node_modules" && fStat.isDirectory()) ||
      (f == ".git" && fStat.isDirectory())) {
      continue;
    }

    if (fStat.isDirectory()) {
      allFiles = allFiles.concat(localFilesListing(fInfo.path));
    } else {
      fInfo.type = "F";
      fInfo.mtime = fStat.mtime;
      allFiles.push(fInfo);
    }
  }

  return allFiles;
}

module.exports = function deploy() {
  console.log("im deploying!!!");
  const files = localFilesListing(".");
  console.log("final = ");
  console.log(files);
};
