const fs = require("fs");
const log = require("./log");
const Queue = require("sync-queue"); 
let queue = new Queue();
const request = require("request");
const auth = require("./auth");
const path = require("path");
const cliConfs = require("./cliConfs");
const instanceOperation = require("./instance_operation");
const archiver = require("archiver");
const zipArchive = archiver('zip');

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
        reject("failed to obtain changes");
      } else {
        resolve(body);
      }
    });
  });
}

// https://github.com/tessel/sync-queue

function genFile2Send(f) {
  if (f.type == "D" && f.change == "C") {
    return {
      "target": f.path
    };
  } else {
    return {
      "source": f.path,
      "target": f.path
    };
  }
}

function sendFiles(files, config) {
  return new Promise((resolve, reject) => {

    if ( ! files || files.length == 0) {
      resolve();
    }

    var output = fs.createWriteStream(config.token + ".zip");

    output.on('close', function() {
      sendFile(config.token + ".zip", config).then((result) => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });

    zipArchive.pipe(output);

    const files2Send =
      files.filter(f => !(f.type == "D" && f.change == "C"))
      .map(f => genFile2Send(f));

    for (let f of files2Send) {
      zipArchive.file(f.target, { name: f.target });
    }

    zipArchive.finalize(function(err, bytes) {
        if(err) {
          reject(err);
        }
    });

  });
}

function sendFile(file, config) {
  return new Promise((resolve, reject) => {

    let formData = {
      "info": JSON.stringify({"path": file}),
      "version": config.version
    };

    let file2Upload = fs.createReadStream(file);
    formData.file = file2Upload

    let url = API_URL + 'instances/' + config.site_name +
      "/sendCompressedFile";

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      formData: formData
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
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
        reject("failed to delete");
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
          reject(err);
        });
      });
    });
  });
}

function deleteLocalArchive(env) {
  fs.unlink(env.token + ".zip", function(err) {

  });
}

async function deploy(env) {
  try {
    const localFiles = localFilesListing(".");

    let resChanges = await findChanges(localFiles, env);
    let changes = JSON.parse(resChanges);
    let files2Modify = changes.filter(f => f.change == 'M' || f.change == 'C');
    let files2Delete = changes.filter(f => f.change == 'D');

    await deleteFiles(files2Delete, env);
    await sendFiles(files2Modify, env);
    deleteLocalArchive(env);
    return await instanceOperation("restart", env);
  } catch(err) {
    deleteLocalArchive(env);
    return err;
  }
}

module.exports = {
  localFilesListing,
  sendFile,
  sendFiles,
  deploy
}
