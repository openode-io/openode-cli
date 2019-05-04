const fs = require("fs");
const log = require("./log");
const request = require("request");
const auth = require("./auth");
const path = require("path");
const cliConfs = require("./cliConfs");
const instanceOperation = require("./instance_operation");
const locationsModule = require("./locations");
const archiver = require("archiver");
const asciify = require("asciify");
const sha1File = require("sha1-file");

const LIMIT_BYTES_PER_ARCHIVE = 10000000;
const LIMIT_BYTES_PER_FILE = 50000000;

function promisifiedSha1File(path) {
  return new Promise((resolve, reject) => {
    sha1File(path, function(err, sum) {
      if (err) {
        reject(err);
      } else {
        resolve(sum);
      }
    })
  });
}

async function localFilesListing(dir, files2Ignore, firstLevel = false) {
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
      allFiles = allFiles.concat((await localFilesListing(fInfo.path, files2Ignore)));
      fInfo.type = "D";
      fInfo.mtime = fStat.mtime;
      allFiles.push(fInfo);
    } else {
      const checksum = await promisifiedSha1File(fInfo.path);

      fInfo.type = "F";
      fInfo.mtime = fStat.mtime;
      fInfo.size = fStat.size;
      fInfo.checksum = checksum;
      allFiles.push(fInfo);
    }
  }

  return JSON.parse(JSON.stringify(allFiles));
}


function findChanges(files, config, options) {
  return new Promise((resolve, reject) => {

    let url = cliConfs.getApiUrl() + 'instances/' + config.site_name + "/changes";

    let form = Object.assign({}, { "files": JSON.stringify(files) });
    form.location_str_id = options.location_str_id;

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      json: true,
      formData: form
    }, function optionalCallback(err, httpResponse, body) {

      if (err) {
        reject("failed to obtain changes");
      } else {
        resolve(body);
      }
    });
  });
}

function sendCompressedFile(file, config, options) {
  return new Promise((resolve, reject) => {

    let formData = {
      "info": JSON.stringify({"path": file}),
      "version": config.version,
      "location_str_id": options.location_str_id
    };

    let file2Upload = fs.createReadStream(file);
    formData.file = file2Upload

    let url = cliConfs.getApiUrl() + 'instances/' + config.site_name +
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

function sendFile(file, config, options) {
  return new Promise((resolve, reject) => {

    let formData = {
      "info": JSON.stringify({"path": file}),
      "version": config.version,
      "location_str_id": options.location_str_id
    };

    let file2Upload = fs.createReadStream(file);
    formData.file = file2Upload

    let url = cliConfs.getApiUrl() + 'instances/' + config.site_name +
      "/sendFile";

    request.post({
      headers: {
        "x-auth-token": config.token
      },
      url: url,
      formData: formData
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

function deleteFiles(files, config, options) {
  return new Promise((resolve, reject) => {
    if ( ! files || files.length == 0) {
      return resolve();
    }

    let formData = {
      "filesInfo": JSON.stringify(files),
      "location_str_id": options.location_str_id
    };

    let url = cliConfs.getApiUrl() + 'instances/' + config.site_name +
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
  return new Promise((resolve, reject) => {
    fs.unlink(env.token + ".zip", function(err) {
      if (err) {
        resolve(err);
      } else {
        resolve();
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

function sendFiles(files, config, options) {
  return new Promise((resolve, reject) => {
    const zipArchive = archiver('zip');

    if ( ! files || files.length == 0) {
      resolve();
    }

    var output = fs.createWriteStream(config.token + ".zip");

    output.on('close', function() {
      sendCompressedFile(config.token + ".zip", config, options).then((result) => {
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

function groupedFiles2Send(files) {
  const result = [];
  let curGroup = [];
  let curGroupSize = 0;

  for (let f of files) {
    curGroup.push(f);
    curGroupSize += f.size;

    // LIMIT_BYTES_PER_ARCHIVE
    if (curGroupSize >= LIMIT_BYTES_PER_ARCHIVE) {
      result.push(curGroup);
      curGroup = [];
      curGroupSize = 0;
    }
  }

  if (curGroup.length > 0) {
    result.push(curGroup);
  }

  return result;
}

async function execSyncFiles(env, options) {
  try {
    const localFiles = await localFilesListing(".", env.files2Ignore, true);

    let resChanges = await findChanges(localFiles, env, options);
    let changes = JSON.parse(resChanges);
    let files2Modify = changes.filter(f => (f.change == 'M' || f.change == 'C') && f.type === 'F')
      .filter(f => {

        if (f.size > LIMIT_BYTES_PER_FILE) {
          console.log(`WARNING: the file ${f.path} exceeds the max file size of ${LIMIT_BYTES_PER_FILE/1000/1000} MB`);
        }

        return f.size <= LIMIT_BYTES_PER_FILE;
      });

    let files2Delete = changes.filter(f => f.change == 'D');

    await deleteFiles(files2Delete, env, options);

    let curFileIndex = 0;
    const groupsFiles = groupedFiles2Send(files2Modify);

    for (let groupFiles of groupsFiles) {
      for (let trial = 0; trial <= 2; ++trial) {
        try {
          await deleteLocalArchive(env);

          for (const f of groupFiles) {
            console.log(`Sending files (trial ${trial + 1}) - file=${f.path} size=${f.size} operation=${f.change}`)
          }

          await sendFiles(groupFiles, env, options);

          curFileIndex += groupFiles.length;

          console.log(`${curFileIndex}/${files2Modify.length}`);

          break;
        } catch(err) {
          console.log(err)

          if (trial === 2) {
            await deleteLocalArchive(env);
            throw new Error(`Failed sending`)
          } else {
            console.log('... failed, retrying')
          }
        }
      }

      await deleteLocalArchive(env);
    }

    return {
      files2Delete,
      files2Modify
    };
  } catch(err) {
    console.log(err);
    throw err;
  }
}

async function ensureOneLocation(env, options) {
  let locations2Deploy = await locationsModule.getLocations(env);

  if ( ! locations2Deploy || locations2Deploy.length == 0) {
    const leastLoaded = await locationsModule.leastLoadedLocation(env);

    if (leastLoaded) {
      options.location_str_id = leastLoaded.id;
      await instanceOperation("addLocation", env, options);
      locations2Deploy = await locationsModule.getLocations(env);
    }
  }

  return locations2Deploy;
}

async function deploy(env, options) {
  try {
    let locations2Deploy = await ensureOneLocation(env, options);

    const locations2Clean = await locationsModule.getLocations2Clean(locations2Deploy, env);

    for (const location of locations2Clean) {
      await instanceOperation("eraseAll", env, { "location_str_id": location.id });
    }

    const result = [];

    for (const location of locations2Deploy) {
      options.location_str_id = location.id;

      await execSyncFiles(env, options);

      const curRes = await instanceOperation("restart", env, options);

      result.push({
        location: location.id,
        result: curRes
      });
    }

    return result;
  } catch(err) {
    return err;
  }
}

async function syncFiles(env, options) {
  try {
    let res = await execSyncFiles(env, options);

    return {
      "result": "success",
      "details": `${res.files2Modify.length} change(s), ${res.files2Delete.length} deletion(s)`
    }
  } catch(err) {
    return err;
  }
}

function hasResultVariable(result, key) {
  return result && result.find(r => {
    return r && (r[key] || (r.result && r.result[key]));
  });
}

function removeResultVariable(result, key) {
  result.forEach(r => {
    if (r) {
      delete r[key];
    }

    if (r && r.result) {
      delete r.result[key];
    }
  });
}

function prepareFinalResult(result) {
  return new Promise((resolve) => {
    let bootLogs = "";
    let logs = "";

    if (bootLogs = hasResultVariable(result, "Boot Logs")) {
      const resBoot = bootLogs["Boot Logs"] || (bootLogs.result && bootLogs.result["Boot Logs"]);
      logs = resBoot;

      removeResultVariable(result, "Boot Logs");
    }

    if (hasResultVariable(result, "isFirstUp")) {
      asciify('Now online!', {color: 'green', font: "big"}, function (err, asciiArt) {

        removeResultVariable(result, "isFirstUp");

        resolve({
          result,
          logs
        })
      });
    } else {
      resolve({
        result,
        logs
      })
    }
  });
}

module.exports = {
  localFilesListing,
  sendFile,
  deploy,
  syncFiles,
  ensureOneLocation,
  deleteLocalArchive,
  prepareFinalResult
}
