const expect = require('expect.js');
const fs = require("fs");
const cliConf = require("../modules/cliConfs");
const proc = require('child_process');

describe('CLI Conf', function() {

  it("should have the right api url", function() {
    expect(cliConf.API_URL).to.equal("https://api.openode.io/");
  });

});
