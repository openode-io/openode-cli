
const expect = require('expect.js');
const reqModule = require("../modules/req");
const cliConfs = require("../modules/cliConfs");
const nock = require("nock");

describe('Req', function() {
  describe('prepareUrl', function() {
    it("when providing url", function() {
      const url = 'http://my.com/'
      expect(reqModule.prepareUrl(url)).to.equal(url)
    });

    it("when not providing url", function() {
      const url = null
      const path = '/titi'
      expect(reqModule.prepareUrl(url, path)).to.equal(cliConfs.getApiUrl() + path)
    });
  });

  describe('get', function() {
    it("with url, without skip response processing", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get(path)
      .reply(200, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      const result = await reqModule.get(null, config, beginUrl + path, false)

      expect(result).to.eql({ version: '2.0.16' })
    });

    it("with 400 status code", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get(path)
      .reply(400, {
        error: 'major issue'
       });

      const config = {
        token: '1234'
      }

      try {
        await reqModule.get(null, config, beginUrl + path, false)
        throw 'invalid'
      } catch(err) {
        expect(err.error).to.equal('major issue')
      }
    });
  });
});