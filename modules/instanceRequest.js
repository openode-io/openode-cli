const fetch = require("./req");
const packageJson = require("../package.json");

function getOp(operation, sitename, config, options = {}) {
    if (!sitename || sitename == "") return {}
    const params = Object.keys(options).map(k => k + '=' + options[k]).join("&");
    return fetch.get('instances/' + sitename + "/" + operation + "?" + params, config)
}

function postOp(operation, sitename, form, config) {
    if (!sitename || sitename == "") return {}
    return fetch.post('instances/' + sitename + "/" + operation + '?version=' + packageJson.version, form, config)
}

function delOp(operation, sitename, id, config) {
    if (!sitename || sitename == "") reject({});
    return fetch.remove('instances/' + sitename + "/" + operation + '?version=' + packageJson.version + '&id=' + id, config )
}

module.exports = {
  getOp,
  postOp,
  delOp
}
