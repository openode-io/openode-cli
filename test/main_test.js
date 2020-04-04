const expect = require('expect.js');
const mainModule = require("../modules/main.js");
const nock = require("nock");

describe('Main', function() {
  describe('verifyAsyncCLIVersion', function() {
    it("if has outdated version should return error message", function(done) {
      nock("https://registry.npmjs.org/")
        .get('/openode/latest')
        .reply(200, {
          version: '2.0.16'
         });

      mainModule.verifyAsyncCLIVersion('2.0.15', (err) => {
        expect(err.includes('WARNING')).to.equal(true);
        done()
      });
    });

    it("with latest version", function(done) {
      nock("https://registry.npmjs.org/")
        .get('/openode/latest')
        .reply(200, {
          version: '2.0.16'
         });

      mainModule.verifyAsyncCLIVersion('2.0.16', (err) => {
        expect(err).to.equal(undefined);
        done()
      });
    });
  });
});