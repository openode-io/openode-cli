const expect = require('expect.js');
const envModule = require("../modules/env.js");

describe('Env', function() {
  describe('Ignore files', function() {
    it("by default", function() {
      let f2ignore = envModule.extractFiles2Ignore("./test/localRepos/ignoreWith0F/.openodeignore");

      expect(f2ignore.indexOf(".openode")).to.not.equal(-1);
      expect(f2ignore.indexOf("openode_scripts")).to.not.equal(-1);
    });

    it("with 1 file", function() {
      let f2ignore = envModule.extractFiles2Ignore("./test/localRepos/ignoreWith1F/.openodeignore");

      expect(f2ignore.indexOf(".openode")).to.not.equal(-1);
      expect(f2ignore.indexOf("openode_scripts")).to.not.equal(-1);
      expect(f2ignore.indexOf(".wtf")).to.not.equal(-1);
    });

    it("with 2 files", function() {
      let f2ignore = envModule.extractFiles2Ignore("./test/localRepos/ignoreWith2F/.openodeignore");

      console.log(f2ignore);

      expect(f2ignore.indexOf(".openode")).to.not.equal(-1);
      expect(f2ignore.indexOf("openode_scripts")).to.not.equal(-1);
      expect(f2ignore.indexOf(".wtf")).to.not.equal(-1);
      expect(f2ignore.indexOf(".wthell")).to.not.equal(-1);
    });

  });

  describe('Base Ignore files', function() {
    it("with dot folder", function() {
      let f2ignore = envModule.files2Ignore("./test/openodeIgnore/withDotFolder");
      expect(f2ignore.indexOf("thisisatest")).to.not.equal(-1);
    });

    it("with folder starting with char", function() {
      let f2ignore = envModule.files2Ignore("./test/openodeIgnore/withFolderStartingWithChar");
      expect(f2ignore.indexOf("thisisatest")).to.not.equal(-1);
    });

    it("with folder starting with slash", function() {
      let f2ignore = envModule.files2Ignore("./test/openodeIgnore/withFolderStartingWithSlash");
      expect(f2ignore.indexOf("thisisatest")).to.not.equal(-1);
    });

    it("various", function() {
      let f2ignore = envModule.files2Ignore("./test/openodeIgnore/various");
      expect(f2ignore.indexOf("thisisatest1")).to.not.equal(-1);
      expect(f2ignore.indexOf("thisisatest2")).to.not.equal(-1);
      expect(f2ignore.indexOf("test3")).to.not.equal(-1);
      expect(f2ignore.indexOf("test4/test3")).to.not.equal(-1);
    });
  })
});
