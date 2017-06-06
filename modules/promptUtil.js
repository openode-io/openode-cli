const prompt = require("prompt");

function promisifyPrompt(schema) {
  return new Promise((resolve, reject) => {
    prompt.start();
    prompt.get(schema, function (err, result) {
      if (err) {
        resolve(null);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = {
  promisifyPrompt
};
