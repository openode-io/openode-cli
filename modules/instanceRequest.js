const apiRequest = require("./req");
const packageJson = require("../package.json");

function getOp(operation, sitename, config, options = {}) {
    if (!sitename || sitename == "") {
        return resolve({})
    }
    const params = Object.keys(options).map(k => k + '=' + options[k]).join("&");
    return apiRequest.get(`instances/${sitename}/${operation}?${params}`, config)
}

function postOp(operation, sitename, form, config) {
    if (!sitename || sitename == "") {
        return resolve({})
    }
    return apiRequest.post(`instances/${sitename}/${operation}?version=${packageJson.version}`, form, config)
}

function delOp(operation, sitename, id, config) {
    if (!sitename || sitename == "") reject({});
    return apiRequest.remove(`instances/${sitename}/${operation}?version=${packageJson.version}&id=${id}`, config)
}

module.exports = {
    getOp,
    postOp,
    delOp
}