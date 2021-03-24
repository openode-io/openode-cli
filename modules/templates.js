const apiRequest = require('./req')
const log = require('./log')
const fs = require('fs')

function getBuildTemplatesFilesList () {
  return apiRequest.get(
    '',
    { token: '' },
    {
      url: 'https://api.github.com/repos/openode-io/build-templates/git/trees/master?recursive=true'
    }
  )
}

function getBuildTemplateProjectFile (path) {
  return apiRequest.get(
    '',
    { token: '' },
    {
      url: 'https://raw.githubusercontent.com/openode-io/build-templates/master/' + path,
      format: 'text'
    }
  )
}

async function templates () {
  const dumpDirContent = await getBuildTemplatesFilesList()

  const templates = dumpDirContent.tree.filter(elem => {
    return elem && elem.path && elem.path.indexOf('v1/templates/') === 0 &&
      elem.path.includes('Dockerfile')
  })
    .map(e => {
      const path = e.path.replace('/Dockerfile', '')
      const name = e.path.replace('/Dockerfile', '').replace('v1/templates/', '')

      return { path, name }
    })

  return templates
}

function templateUrlOf (template) {
  return `https://github.com/openode-io/build-templates/tree/master/${template.path}/Dockerfile`
}

function anyFilesExist (listFiles) {
  return listFiles.some(f => fs.existsSync(f))
}

function determineDefaultTemplate () {
  if (fs.existsSync('./Gemfile')) {
    return 'ruby-on-rails-minimal'
  } else if (fs.existsSync('./mix.exs')) {
    return 'elixir-phoenix'
  } else if (fs.existsSync('./Cargo.toml')) {
    return 'rust-minimal'
  } else if (fs.existsSync('./build.sbt')) {
    return 'scala-sbt'
  } else if (fs.existsSync('./project.clj')) {
    return 'clojure'
  } else if (fs.existsSync('./package.json')) {
    return 'node-minimal'
  } else if (fs.existsSync('./shard.yml')) {
    return 'crystal-minimal'
  } else if (anyFilesExist(['./index.html', './index.htm'])) {
    return 'nginx-static'
  } else if (anyFilesExist(['./index.php'])) {
    return 'php-apache-minimal'
  }

  return undefined
}

async function getTemplateByName (name) {
  const template = (await templates()).find(t => t.name === name)

  if (!template && name) {
    throw new Error(`Template ${name} not found`)
  }

  return template
}

module.exports = async function (operation, env, options = {}) {
  try {
    switch (operation) {
      case 'list-templates':
        return (await templates()).map(t => t.name)
      case 'template-info': {
        const template = await getTemplateByName(options.name)
        let readme = await getBuildTemplateProjectFile(`${template.path}/README.md`)
        const templateUrl = templateUrlOf(template)
        readme += `\n\nTemplate Source (Dockerfile): ${templateUrl}\n`

        return readme
      }
      case 'template': {
        if (fs.existsSync('./Dockerfile')) {
          return {
            result: 'Warning: Dockerfile already exist... skipping template.'
          }
        }

        const allTemplates = await templates()
        let template = await getTemplateByName(options.name)

        if (!template) {
          if (options.name) {
            throw new Error(`Invalid template name ${options.name}`)
          } else {
            const defaultTemplateName = determineDefaultTemplate()

            if (defaultTemplateName) {
              template = allTemplates.find(t => t.name === determineDefaultTemplate())
            } else {
              log.prettyPrint('Could not automatically find a template for this project. ' +
                'Available templates are listed below. ')

              return allTemplates.map(t => t.name)
            }
          }
        }

        if (!fs.existsSync('./Dockerfile')) {
          log.prettyPrint('Creating Dockerfile...')

          const dockerfile = await getBuildTemplateProjectFile(`${template.path}/Dockerfile`)
          const readme = await getBuildTemplateProjectFile(`${template.path}/README.md`)
          fs.writeFileSync('./Dockerfile', dockerfile)

          log.prettyPrint(readme)
        }

        return {
          result: `Successfully applied template ${template.name} to ./Dockerfile. Run *openode deploy* to deploy.`
        }
      }
    }
  } catch (err) {
    return err
  }
}
