const fs = require("fs");
const log = require("./log");
const Queue = require("sync-queue");
let queue = new Queue();
const request = require("request");
const auth = require("./auth");
const path = require("path");
const cliConfs = require("./cliConfs");
const instanceOperation = require("./instance_operation");

const API_URL = cliConfs.API_URL;

function localFilesListing(dir) {
  const files = fs.readdirSync(dir);
  let allFiles = [];

  for (let f of files) {
    let fInfo = {};
    fInfo.path = dir + "/" + f;

    const fStat = fs.lstatSync(fInfo.path);


    if ((f == "node_modules" && fStat.isDirectory()) ||
      (f == ".git" && fStat.isDirectory()) ||
      (f == ".openode")) {
      continue;
    }

    if (fStat.isDirectory()) {
      allFiles = allFiles.concat(localFilesListing(fInfo.path));
      fInfo.type = "D";
      fInfo.mtime = fStat.mtime;
      allFiles.push(fInfo);
    } else {
      fInfo.type = "F";
      fInfo.mtime = fStat.mtime;
      allFiles.push(fInfo);
    }
  }

  return JSON.parse(JSON.stringify(allFiles));
}


function findChanges(files, config) {
  return new Promise((resolve, reject) => {

    let url = API_URL + 'instances/' + config.site_name + "/changes";

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      formData: {
        "files": JSON.stringify(files)
      }
    }, function optionalCallback(err, httpResponse, body) {
      if (err) {
        console.log(err);
        reject("failed send");
      } else {
        resolve(body);
      }
    });
  });
}

// https://github.com/tessel/sync-queue

function sendFiles(files, config) {
  return new Promise((resolve, reject) => {

    if ( ! files || files.length == 0) {
      resolve();
    }

    queue.clear();

    files.forEach((f, index) => {
      queue.place(function() {
        sendFile(f, config).then((result) => {

          if (index == files.length - 1) {
            queue.next();
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

function sendFile(file, config) {
  return new Promise((resolve, reject) => {

    let formData = {
      "info": JSON.stringify(file),
    };

    if (file.type == "F") {
      let file2Upload = fs.createReadStream(file.path);
      formData.file = file2Upload
    }

    let url = API_URL + 'instances/' + config.site_name +
      "/sendFile";

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      formData: formData
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject("failed send");
      } else {
        resolve(body);
      }
    });
  });
}

function deleteFile(file, config) {
  return new Promise((resolve, reject) => {

    let formData = {
      "info": JSON.stringify(file),
    };

    let url = API_URL + 'instances/' + config.site_name +
      "/deleteFile";

    request.delete({
      headers: {
        "x-auth-token": config.token
      },
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
}

function deleteFiles(files, config) {
  return new Promise((resolve, reject) => {
    if ( ! files || files.length == 0) {
      resolve();
    }

    queue.clear();

    files.forEach((f, index) => {
      queue.place(function() {
        deleteFile(f, config).then((result) => {
          if (index == files.length - 1) {
            queue.next();
            resolve();
          } else {
            queue.next();
          }
        }).catch((err) => {
          console.log(err);
          reject(err);
        });
      });
    });
  });
}

async function deploy(env) {
  try {
    const localFiles = localFilesListing(".");

    let resChanges = await findChanges(localFiles, env);
    let changes = JSON.parse(resChanges);
    let files2Modify = changes.filter(f => f.change == 'M' || f.change == 'C');
    let files2Delete = changes.filter(f => f.change == 'D');

    console.log("files 2 modify ");
    console.log(files2Modify)
    await sendFiles(files2Modify, env);
    await deleteFiles(files2Delete, env);
    return await instanceOperation("restart", env);
  } catch(err) {
    return err;
  }
}

module.exports = {
  localFilesListing,
  sendFile,
  sendFiles,
  deploy
}
