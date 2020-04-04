const expect = require('expect.js');
const fs = require("fs");
const cliConf = require("../modules/cliConfs");
const proc = require('child_process');

describe('CLI Conf', function() {
  it("should have the right api url", function() {
    expect(cliConf.getApiUrl()).to.equal("https://api.openode.io/");
  });

  it("should have the right ws url", function() {
    expect(cliConf.WS_ADDR).to.equal("wss://api.openode.io/streams");
  });
});
