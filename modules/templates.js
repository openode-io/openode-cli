const cliConfs = require("./cliConfs");
const request = require("request");
const log = require("./log");
const fs = require("fs");
const instanceReq = require("./instanceRequest");

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

function getBuildTemplateProjectFile(path) {
  return new Promise((resolve, reject) => {

    const url = `https://raw.githubusercontent.com/openode-io/build-templates/master/${path}`;

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

async function getServicesAvailable() {
  const dumpDirContent = await getBuildTemplatesFilesList();

  const templates = dumpDirContent.tree.filter(elem => {
    return elem && elem.path && elem.path.indexOf('services/') === 0 &&
      elem.path.includes('.yml');
  })
  .map(e => {
    const path = e.path;

    return { path };
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
  if (fs.existsSync("./Gemfile")) {
    return `ruby-on-rails-minimal`;
  }
  else if (fs.existsSync("./mix.exs")) {
    return `elixir-phoenix`;
  }
  else if (fs.existsSync("./Cargo.toml")) {
    return `rust-minimal`;
  }
  else if (fs.existsSync("./build.sbt")) {
    return `scala-sbt`;
  }
  else if (fs.existsSync("./shard.yml")) {
    return `crystal-amber`;
  }
  else if (fs.existsSync("./project.clj")) {
    return `clojure`;
  }
  else if (fs.existsSync("./package.json")) {
    return `node-minimal`;
  }
  else if (anyFilesExist(["./index.html", "./index.htm"])) {
    return `nginx-static`;
  }
  else if (anyFilesExist(["./index.php"])) {
    return `php-apache-minimal`;
  }

  return undefined;
}

async function getTemplateByName(name) {
  const template = (await templates()).find(t => t.name === name);

  if ( ! template && name) {
    throw new Error(`Template ${name} not found`);
  }

  return template;
}

async function getDockerComposeService(servicePath) {
  return await getBuildTemplateProjectFile(servicePath);
}

async function dockerComposifyServices(services) {
  const servicesAvailable = await getServicesAvailable();
  let servicesDockerCompose = [];

  for (const service of services) {
    const serviceInfo = servicesAvailable.find(s => s && s.path && s.path.includes(`${service}.yml`));

    if (serviceInfo) {
      const composeContent = await getDockerComposeService(serviceInfo.path);

      servicesDockerCompose.push({
        content: composeContent,
        serviceName: service
      });
    }
  }

  return servicesDockerCompose
}

async function getDockerCompose(env, options) {
  const baseDockerCompose = await instanceReq.getOp("docker-compose", env.site_name, env);

  const services = (options && options.withServices)
    ? options.withServices.split(",")
    : [];

  let servicesDockerCompose = await dockerComposifyServices(services);

  return `${baseDockerCompose.content}
${servicesDockerCompose.map(s => s.content).join("\n")}
`;
}

module.exports = async function(operation, env, options = {}) {
  try {
    switch(operation) {
      case "list-templates":
        return (await templates()).map(t => t.name);
        break;
      case "template-info": {
        const template = await getTemplateByName(options.name);
        let readme = await getBuildTemplateProjectFile(`${template.path}/README.md`);
        const templateUrl = templateUrlOf(template);
        readme += `\n\nTemplate Source (Dockerfile): ${templateUrl}\n`;

        return readme
        break;
      }
      case "template": {

        if (fs.existsSync("./Dockerfile")) {
          throw new Error('A Dockerfile already exists. Make sure to remove/move it before applying a template.');
        }

        if (fs.existsSync("./docker-compose.yml")) {
          throw new Error('A docker-compose.yml already exists. Make sure to remove/move it before applying a template.');
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

        let dockerfile = await getBuildTemplateProjectFile(`${template.path}/Dockerfile`);
        const readme = await getBuildTemplateProjectFile(`${template.path}/README.md`);
        fs.writeFileSync("./Dockerfile", dockerfile)

        log.prettyPrint(readme);

        const dockerCompose = await getDockerCompose(env, options);
        fs.writeFileSync("./docker-compose.yml", dockerCompose);
        log.prettyPrint(`docker-compose.yml:`)
        log.prettyPrint(dockerCompose);


        return {
          result: `Successfully applied template ${template.name} to ./Dockerfile. Run *openode deploy* to deploy.`
        }
        break;
      }
    }

  } catch(err) {
    return err;
  }
};
