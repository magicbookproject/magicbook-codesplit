var cheerio = require('cheerio');
var rimraf = require('rimraf');
var uuid = require('node-uuid');
var build = require('magicbook/src/build');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');

function triggerBuild(config) {
  var uid = uuid.v4().replace('-', "").substring(0, 10);
  _.defaults(config, {
    addPlugins: ["./src/codesplit"],
    files: ["book/content/codesplit.md"],
    destination: "tmp/"+uid+"/:build"
  });
  build(config);
  return uid;
}

beforeAll(function(done) {
  rimraf("tmp/*", function() {
    done();
  });
});

describe("Codesplit plugin", function() {

  it("should split code and comments", function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      codesplit: {
        includes: "book/examples"
      },
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/codesplit.html')).toString();

        var $ = cheerio.load(content);
        expect($('.codesplit').length).toBe(2);

        // liquid tag
        var one = $('.codesplit-content').eq(0);
        expect(one.children().length).toBe(8); // This will if we add end instruction
        expect(one.find('.codesplit-comment').first().html().trim()).toEqual('<p>First we need to set up the variables to be used throughout the sketch.</p>');
        expect(one.find('.codesplit-code').first().html().trim()).toEqual('<pre><code>var x = 100;\nvar y = 100;\nvar xspeed = 1;\nvar yspeed = 3.3;\nvar myName = &quot;Rune Madsen&quot;;\n</code></pre>');

        // inline tag
        var two = $('.codesplit-content').eq(1);
        expect(two.children().length).toBe(8); // This will if we add end instruction
        expect(two.find('.codesplit-comment').first().html().trim()).toEqual('<p>First we need to set up the variables to be used throughout the sketch.</p>');
        expect(two.find('.codesplit-code').first().html().trim()).toEqual('<pre><code>var x = 100;\nvar y = 100;\nvar xspeed = 1;\nvar yspeed = 3.3;\nvar myName = &quot;Rune Madsen&quot;;\n</code></pre>');
        done();
      }
    });
  });

});
