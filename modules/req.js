
const cliConfs = require("./cliConfs");
const fetch = require("node-fetch");

function prepareUrl(url, path) {
  if (url) {
    return url
  }

  return cliConfs.getApiUrl() + path;
}

async function processJsonResponse(response, skipResponseProcessing = false) {
  if (response.ok) {
    if (skipResponseProcessing) {
      return true
    } else {
      return response.json()
    }
  } else {
    if (skipResponseProcessing) {
      return false
    } else {
      throw await response.json()
    }
  }
}

async function get(path, config, url = null, skipResponseProcessing = false) {
  const response = await fetch(prepareUrl(url, path), {
    headers: {
      "content-type": "application/json",
      "x-auth-token": config.token,
      'User-Agent': 'express'
    },
  })
  
  return processJsonResponse(response, skipResponseProcessing)
}

function post(path, params, config, url = null) {
  return new Promise((resolve, reject) => {
    
    fetch(prepareUrl(url, path), {
        method: 'POST',
        headers: {
          "content-type": "application/json",
          "x-auth-token": config.token,
          'User-Agent': 'express'
        },
        body: JSON.stringify(params)
      })
      .then(response => {
        if (response.ok) {
          response.json().then(function (data) {
            resolve(data);
          })
        } else {
          response.json().then(function (data) {
            reject(data);
          })
        }
      })
      .catch(function (err) {
        console.log(err)
      })
  })
}


async function upload(path, params, config, url = null, length = 0) {
  

  const response = await fetch(prepareUrl(url, path), {
      method: 'POST',
      headers: {
        "contentType": "application/json",
        "x-auth-token": config.token,
        'User-Agent': 'express',
        "Content-Length": length
      },
      body: params
    })

  return response.text()
}

function remove(path, params, config, url = null) {
  return new Promise((resolve, reject) => {
    
    fetch(prepareUrl(url, path), {
        method: 'DELETE',
        headers: {
          "content-type": "application/json",
          "x-auth-token": config.token,
          'User-Agent': 'express'
        },
        body: JSON.stringify(params)
      })
      .then(response => {
        if (response.ok) {
          response.json().then(function (data) {
            resolve(data);
          })
        } else {
          response.json().then(function (data) {
            reject(data);
          })
        }
      })
      .catch(function (err) {
        console.log(err)
      })
  })
}

module.exports = {
  get,
  post,
  processJsonResponse,
  remove,
  prepareUrl,
  upload
};