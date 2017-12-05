const fs = require("fs");
const log = require("./log");
const request = require("request");
const auth = require("./auth");
const path = require("path");
const cliConfs = require("./cliConfs");
const instanceOperation = require("./instance_operation");
const locationsModule = require("./locations");
const archiver = require("archiver");
const zipArchive = archiver('zip');
const unzip = require("unzip");

const API_URL = cliConfs.API_URL;

function localFilesListing(dir, files2Ignore, firstLevel = false) {
  const files = fs.readdirSync(dir);
  let allFiles = [];

  for (let f of files) {
    let fInfo = {};
    fInfo.path = dir + "/" + f;

    const fStat = fs.lstatSync(fInfo.path);

    // should we ignore and skip?
    if (files2Ignore && files2Ignore.indexOf(path.normalize(fInfo.path)) >= 0 ||
      (firstLevel && files2Ignore && files2Ignore.indexOf(path.normalize(f)) >= 0)) {
      continue;
    }

    if (fStat.isDirectory()) {
      allFiles = allFiles.concat(localFilesListing(fInfo.path, files2Ignore));
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

function deleteFiles(files, config) {
  return new Promise((resolve, reject) => {
    if ( ! files || files.length == 0) {
      return resolve();
    }

    let formData = {
      "filesInfo": JSON.stringify(files),
    };

    let url = API_URL + 'instances/' + config.site_name +
      "/deleteFiles";

    request.delete({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      formData: formData
    }, function optionalCallback(err, httpResponse, body) {
      if (err) {
        reject("failed to delete files");
      } else {
        resolve(body);
      }
    });

  });
}

function deleteLocalArchive(env) {
  fs.unlink(env.token + ".zip", function(err) {

  });
}

async function execSyncFiles(env) {
  try {
    const localFiles = localFilesListing(".", env.files2Ignore, true);

    let resChanges = await findChanges(localFiles, env);
    let changes = JSON.parse(resChanges);
    let files2Modify = changes.filter(f => f.change == 'M' || f.change == 'C');
    let files2Delete = changes.filter(f => f.change == 'D');

    await deleteFiles(files2Delete, env);
    await sendFiles(files2Modify, env);
    deleteLocalArchive(env);

    return {
      files2Delete,
      files2Modify
    };
  } catch(err) {
    deleteLocalArchive(env);
    throw err;
  }
}

async function getLocations(env) {
  return await instanceOperation("locations", env, { } );
}

async function getLocations2Clean(locations2Deploy, env) {
  const availableLocations = await locationsModule(env);

  return availableLocations.filter((location) => {
    return ! locations2Deploy.find((l) => l.id == location.id);
  });
}

async function deploy(env, options) {
  try {
    const locations2Deploy = await getLocations(env);
    const locations2Clean = await getLocations2Clean(locations2Deploy, env);

    for (const location of locations2Clean) {
      await instanceOperation("eraseAll", env, { "location_id": location.id });
    }

    await execSyncFiles(env);

    return await instanceOperation("restart", env, options);
  } catch(err) {
    deleteLocalArchive(env);
    return err;
  }
}

async function syncFiles(env) {
  try {
    let res = await execSyncFiles(env);

    return {
      "result": "success",
      "details": `${res.files2Modify.length} change(s), ${res.files2Delete.length} deletion(s)`
    }
  } catch(err) {
    return err;
  }
}

function pullAll(config) {
  return new Promise((resolve, reject) => {

    let formData = {
      "version": config.version
    };

    let url = API_URL + 'instances/' + config.site_name +
      "/pull";

    request.get({
      headers: {
        "x-auth-token": config.token
      },
      url: url
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject();
      } else {
        resolve();
      }
    }).pipe(fs.createWriteStream(config.token + '.zip'));
  });
}

function unzipRepo(env) {
  return new Promise((resolve, reject) => {
    const unzipExtractor = unzip.Extract({ path: '.' });
    fs.createReadStream(env.token + ".zip").pipe(unzipExtractor);

    unzipExtractor.on('close', function() {
      deleteLocalArchive(env);
      resolve();
    });

    unzipExtractor.on('error', function(err) {
      reject(err);
    });
  });
}

async function pull(env) {
  try {
    await pullAll(env);

    await unzipRepo(env);

    return {"result": "success"};
  } catch(err) {
    deleteLocalArchive(env);
    return err;
  }
}

module.exports = {
  localFilesListing,
  sendFile,
  sendFiles,
  deploy,
  syncFiles,
  pull
}
