const apiRequest = require('./req')
const packageJson = require('../package.json')

async function getOp (operation, sitename, config, options = {}) {
  if (!sitename || sitename === '') {
    return {}
  }

  const params = Object.keys(options).map(k => k + '=' + options[k]).join('&')

  return apiRequest.get(
        `instances/${sitename}/${operation}?${params}`,
        config
  )
}

async function postOp (operation, sitename, form, config) {
  if (!sitename || sitename === '') {
    return {}
  }

  return apiRequest.post(
        `instances/${sitename}/${operation}?version=${packageJson.version}`,
        form,
        config
  )
}

async function delOp (operation, sitename, id, config) {
  if (!sitename || sitename === '') {
    return {}
  }

  return apiRequest.remove(
        `instances/${sitename}/${operation}?version=${packageJson.version}&id=${id}`,
        {},
        config
  )
}

module.exports = {
  getOp,
  postOp,
  delOp
}
