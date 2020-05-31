const expect = require('expect.js')
const nock = require('nock')
const cliConf = require("../modules/cliConfs");
const instance = require("../modules/instance");

describe('instance', function() {
  describe('getWebsite', function() {
    it("with 200 status", async function() {
      nock(`${cliConf.getApiUrl()}`, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get('/instances/hiworld/')
      .reply(200, {
        site_name: 'hiworld'
       });

      const result = await instance.getWebsite('hiworld', { token: '1234' })

      expect(result).to.eql({ site_name: 'hiworld' })
    });

    it("with 404 status", async function() {
      nock(`${cliConf.getApiUrl()}`, {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get('/instances/hiworld/')
      .reply(404, {
        site_name: 'hiworld'
       });

      const result = await instance.getWebsite('hiworld', { token: '1234' })

      expect(result).to.equal(null)
    });
  });
});
