
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

      const result = await reqModule.get(
        null,
        config,
        {
          url: beginUrl + path,
          skipResponseProcessing: false 
        })

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
        await reqModule.get(
          null,
          config,
          {
            url: beginUrl + path,
            skipResponseProcessing: false 
          })
        throw 'invalid'
      } catch(err) {
        expect(err.error).to.equal('major issue')
      }
    });

    it("with skipResponseProcessing, status 200", async function() {
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

      const result = await reqModule.get(
        null,
        config,
        {
          url: beginUrl + path,
          skipResponseProcessing: true
        })

      expect(result).to.eql(true)
    });

    it("with skipResponseProcessing, status 400", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get(path)
      .reply(400, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      const result = await reqModule.get(
        null,
        config,
        {
          url: beginUrl + path,
          skipResponseProcessing: true
        })

      expect(result).to.eql(false)
    });
  });

  describe('post', function() {
    it("with url", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .post(path, { test: '123' })
      .reply(200, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      const result = await reqModule.post(null, { test: '123' }, config, beginUrl + path)

      expect(result).to.eql({ version: '2.0.16' })
    });

    it("with url, status 400", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .post(path, { test: '123' })
      .reply(400, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      try {
        await reqModule.post(null, { test: '123' }, config, beginUrl + path)
        throw 'invalid'
      } catch(err) {
        expect(err).to.eql({ version: '2.0.16' })
      }
    });
  });

  describe('upload', function() {
    it("with url, without skip response processing", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234',
          'content-length': 15
        }
      })
      .post(path, "[object Object]")
      .reply(200, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      const result = await reqModule.upload(null, { test: '123' }, config,
                                            beginUrl + path, 15)

      expect(result).to.eql(JSON.stringify({ version: '2.0.16' }))
    });
  });

  describe('remove', function() {
    it("with url", async function() {
      const beginUrl = "https://registry.npmjs.org"
      const path = "/openode/latest"

      nock(beginUrl, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .delete(path)
      .reply(200, {
        version: '2.0.16'
       });

      const config = {
        token: '1234'
      }

      const result = await reqModule.remove(null, { test: '123' }, config,
                                            beginUrl + path)

      expect(result).to.eql({ version: '2.0.16' })
    });
  });
});
