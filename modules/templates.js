const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");

function getBuildTemplatesFilesList() {
  return new Promise((resolve, reject) => {

    const url = `https://api.github.com/repos/openode-io/build-templates/git/trees/master?recursive=true`;

    request.get({
      headers: {
        'User-Agent': 'express'
      },
      url,
      timeout: 300000,
      json: true,
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });

  })
}

function getTemplateReadme(template) {
  return new Promise((resolve, reject) => {

    const url = `https://raw.githubusercontent.com/openode-io/build-templates/master/${template.path}/README.md`;

    request.get({
      headers: {
        'User-Agent': 'express'
      },
      url,
      timeout: 300000,
    }, function optionalCallback(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });

  })
}

async function templates() {
  const dumpDirContent = await getBuildTemplatesFilesList();

  const templates = dumpDirContent.tree.filter(elem => {
    return elem && elem.path && elem.path.indexOf('templates/') === 0 &&
      elem.path.includes('Dockerfile');
  })
  .map(e => {
    const path = e.path.replace('/Dockerfile', '');
    const name = e.path.replace('/Dockerfile', '').replace('templates/', '');

    return { path, name };
  });

  return templates;
}

module.exports = async function(operation, env, options = {}) {
  try {
    switch(operation) {
      case "list-templates":
        return (await templates()).map(t => t.name);
        break;
      case "template-info":
        const template =  (await templates()).find(t => t.name === options.name);
        let readme = await getTemplateReadme(template);
        const templateUrl = `https://github.com/openode-io/build-templates/tree/master/${template.path}/Dockerfile`;
        readme += `\n\nTemplate Source (Dockerfile): ${templateUrl}\n`;

        return readme
        break;
    }

  } catch(err) {
    return err;
  }
};
