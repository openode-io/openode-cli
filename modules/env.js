const fs = require('fs');

function get() {
  try {
    let content = fs.readFileSync('./.openode');

    return JSON.parse(content);
  } catch(err) {
    return {};
  }
};

module.exports = {
  get
};
