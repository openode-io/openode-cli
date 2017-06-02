const fs = require("fs");
const log = require("./log");
const Queue = require("sync-queue");
let queue = new Queue();
const request = require("request");
const auth = require("./auth");
const path = require("path");

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

function sendFile(file, config) {
  return new Promise((resolve, reject) => {
    console.log("in ");
    console.log(file);

    let formData = {
      "info": JSON.stringify(file),
      "file": fs.createReadStream(file.path)
    };
    //
    console.log("after form data");

    let url = 'http://localhost:3002/instances/' + config.site_name +
      "/sendFile?token=" + config.token

    request.post({
      url: url,
      formData: formData
    }, function optionalCallback(err, httpResponse, body) {
      if (err) {
        console.log(err);
        reject("failed send");
      } else {
        resolve(body);
      }
    });
  });
  // ...
  //console.log("f = " + file);
}

// https://github.com/tessel/sync-queue

function sendFiles(files, config) {
  return new Promise((resolve, reject) => {
    files.forEach((f, index) => {
      queue.place(function() {
        sendFile(f, config).then((result) => {

          console.log(result);

          if (index == files.length - 1) {
            resolve();
          } else {
            queue.next();
          }
        }).catch((err) => {
          reject(err);
        });
      });
    });
  });
}

module.exports = function deploy() {

  const site_name = "test123";
  const token = auth();
  const config = {
    site_name,
    token
  }

  const files = localFilesListing(".");

  // verifyFilesRequired .. todo

  // filesToSend = ...
  sendFiles(files, config).then(() => {
    console.log("sent all files");

    // API restart

  }).catch((err) => {
    console.log(err);
  });

  console.log(files);
};
