const expect = require('expect.js');
const fs = require("fs");
const ciConf = require("../modules/ciConf");
const proc = require('child_process');

describe('CI Conf', function() {

  beforeEach(function() {
    try {
      fs.unlinkSync(".openode");
    } catch(err) {

    }
  });

  it("should generate proper .openode", function(done) {
    ciConf("supertokenkey123", "myprettysite");

    const content = fs.readFileSync(".openode").toString();
    const expectedContent = JSON.stringify({
      "token": "supertokenkey123",
      "site_name": "myprettysite"
    });
    
    expect(content.indexOf(expectedContent))
      .to.not.equal(-1);
    done();
  });

  afterEach(function() {
    try {
      fs.unlinkSync(".openode");
    } catch(err) {

    }
  });

});
