const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const fs = require("fs");

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

function getTemplateFile(template, filename) {
  return new Promise((resolve, reject) => {

    const url = `https://raw.githubusercontent.com/openode-io/build-templates/master/${template.path}/${filename}`;

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

function templateUrlOf(template) {
  return `https://github.com/openode-io/build-templates/tree/master/${template.path}/Dockerfile`;
}

function anyFilesExist(listFiles) {
  return listFiles.some(f => fs.existsSync(f));
}

function determineDefaultTemplate() {
  if (fs.existsSync("./package.json")) {
    return `node-minimal`;
  }
  else if (anyFilesExist(["./index.html", "./index.htm"])) {
    return `nginx-static`;
  }

  return undefined;
}

async function getTemplateByName(name) {
  const template = (await templates()).find(t => t.name === name);

  if ( ! template) {
    throw new Error(`Template ${name} not found`);
  }

  return template;
}

module.exports = async function(operation, env, options = {}) {
  try {
    switch(operation) {
      case "list-templates":
        return (await templates()).map(t => t.name);
        break;
      case "template-info": {
        const template = await getTemplateByName(options.name);
        let readme = await getTemplateFile(template, "README.md");
        const templateUrl = templateUrlOf(template);
        readme += `\n\nTemplate Source (Dockerfile): ${templateUrl}\n`;

        return readme
        break;
      }
      case "template": {

        if (fs.existsSync("./Dockerfile")) {
          throw new Error('A Dockerfile already exists. Make sure to remove it before applying a template.');
        }

        const allTemplates = await templates();
        let template =  await getTemplateByName(options.name);

        if ( ! template) {
          if (options.name) {
            throw new Error(`Invalid template name ${options.name}`)
          } else {
            const defaultTemplateName = determineDefaultTemplate()

            if (defaultTemplateName) {
              template = allTemplates.find(t => t.name === determineDefaultTemplate());
            } else {
              log.prettyPrint('Could not automatically find a template for this project. ' +
                'Available templates are listed below. ');

              return allTemplates.map(t => t.name);
            }

          }
        }

        let dockerfile = await getTemplateFile(template, "Dockerfile");
        fs.writeFileSync("./Dockerfile", dockerfile)

        return {
          result: 'Successfully applied to ./Dockerfile. Run *openode deploy* to deploy.'
        }
        break;
      }
    }

  } catch(err) {
    return err;
  }
};
