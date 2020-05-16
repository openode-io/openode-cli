const cliConfs = require("./cliConfs");
const fetch = require("node-fetch");

function get(path, config, url = null, bool = false) {
  return new Promise((resolve, reject) => {
    if (url === null) url = cliConfs.getApiUrl() + path;
    fetch(url, {
        headers: {
          "content-type": "application/json",
          "x-auth-token": config.token,
          'User-Agent': 'express'
        },
      })
      .then(response => {
        if (response.ok) {
          if (!bool) {
            response.json().then(function (data) {
              resolve(data);
            })
          } else resolve(true)
        } else {
          if (!bool) {
            response.json().then(function (data) {
              reject(data);
            })
          } else resolve(false)
        }
      })
      .catch(function (err) {
        console.log(err)
      })
  })
}

function post(path, params, config, url = null) {
  return new Promise((resolve, reject) => {
    if (url === null) url = cliConfs.getApiUrl() + path;
    fetch(url, {
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


function upload(path, params, config, url = null) {
  return new Promise((resolve, reject) => {
    if (url === null) url = cliConfs.getApiUrl() + path;
    fetch(url, {
        method: 'POST',
        headers: {
          "content-type": "application/json",
          "x-auth-token": config.token,
          'User-Agent': 'express'
        },
        body: JSON.stringify(params)
      })
      .then(response => {
        console.log(response)
        if (response.ok) {
          response.text().then(function (data) {
            resolve(data);
          })
        } else {
          response.text().then(function (data) {
            reject(data);
          })
        }
      })
      .catch(function (err) {
        console.log(err)
      })
  })
}

function remove(path, params, config, url = null) {
  return new Promise((resolve, reject) => {
    if (url === null) url = cliConfs.getApiUrl() + path;
    fetch(url, {
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
  upload,
  remove
};