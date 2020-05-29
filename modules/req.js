
const cliConfs = require("./cliConfs");
const fetch = require("node-fetch");

function prepareUrl(url, path) {
  if (url) {
    return url
  }

  return cliConfs.getApiUrl() + path;
}

async function processJsonResponse(response,
                                    skipResponseProcessing = false,
                                    format = 'json') {
  if (response.ok) {
    if (skipResponseProcessing) {
      return true
    } else {
      return response[format]()
    }
  } else {
    if (skipResponseProcessing) {
      return false
    } else {
      throw (await response[format]())
    }
  }
}

async function get(path, config, { url, skipResponseProcessing, format } = {}) {
  const response = await fetch(prepareUrl(url, path), {
    headers: {
      "content-type": "application/json",
      "x-auth-token": config.token,
      'User-Agent': 'express'
    },
  })
  
  return processJsonResponse(response, skipResponseProcessing, format)
}

async function post(path, params, config, url = null) {
  const response = await fetch(prepareUrl(url, path), {
    method: 'POST',
    headers: {
      "content-type": "application/json",
      "x-auth-token": config.token,
      'User-Agent': 'express'
    },
    body: JSON.stringify(params)
  })

  return processJsonResponse(response)
}

async function upload(path, params, config, url = null, length = 0) {
  const response = await fetch(prepareUrl(url, path), {
      method: 'POST',
      headers: {
        "x-auth-token": config.token,
        'User-Agent': 'express',
        "Content-Length": length
      },
      body: params
    })

  return response.text()
}

async function remove(path, params, config, url = null) {
  const response = await fetch(prepareUrl(url, path), {
    method: 'DELETE',
    headers: {
      "content-type": "application/json",
      "x-auth-token": config.token,
      'User-Agent': 'express'
    },
    body: JSON.stringify(params)
  })

  return processJsonResponse(response)
}

module.exports = {
  get,
  post,
  processJsonResponse,
  remove,
  prepareUrl,
  upload
};