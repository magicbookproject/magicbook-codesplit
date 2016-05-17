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
    destination: "tmp/"+uid+"/:build",
    liquid : {
      includes: "book/examples"
    },
    codesplit: {
      includes: "book/examples"
    }
  });
  build(config);
  return uid;
}

beforeAll(function(done) {
  rimraf("tmp/*", function() {
    done();
  });
});

function expectCode($) {

  // The first should have the code and the comment
  expect($.find('.pair').eq(0).find('.comment p').html()).toEqual('First we need to set up the variables to be used throughout the sketch.');
  expect($.find('.pair').eq(0).find('.code pre code').html()).toEqual('var x = 100;\nvar y = 100;\n');

  // Then we should have a magic space
  expect($.find('.pair').eq(1).find('.comment').length).toBe(0);
  expect($.find('.pair').eq(1).find('.code pre code').html()).toEqual('\n');

  // the second should have a class and an ID
  expect($.find('.pair').eq(2).hasClass('myClass')).toBe(true);
  expect($.find('.pair').eq(2).hasClass('myOtherClass')).toBe(true);
  expect($.find('.pair').eq(2).attr('id')).toEqual('myId');

  // the third should have just one line of code
  expect($.find('.pair').eq(3).find('.comment p').html()).toEqual('This is a createCanvas function');
  expect($.find('.pair').eq(3).find('.code pre code').html()).toEqual('  createCanvas(640, 360);\n');

  // The last should have just the final code
  expect($.find('.pair').eq(4).find('.comment').length).toBe(0)
  expect($.find('.pair').eq(4).find('.code pre code').html()).toEqual('  background(255);\n}\n\n')
}

describe("Codesplit plugin", function() {

  it("should split code and comments", function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      files: ["book/content/codesplit.md"],
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/codesplit.html')).toString();
        var $ = cheerio.load(content);
        expectCode($('.codesplit').eq(0));
        expectCode($('.codesplit').eq(1));
        done();
      }
    });
  });

  it("should work on more advanced example", function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      files: ["book/content/advanced.md"],
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/advanced.html')).toString();
        var $ = cheerio.load(content);
        expect($('.pair').eq(0).find('.comment p').text()).toEqual('Variables for location and speed of ball.');
        expect($('.pair').eq(0).find('.code pre code').html()).toEqual('float x = 100;\nfloat y = 100;\nfloat xspeed = 1;\nfloat yspeed = 3.3;\n');
        expect($('.pair').eq(1).find('.comment').length).toBe(0);
        expect($('.pair').eq(1).find('.code pre code').html()).toEqual('\n');
        expect($('.pair').eq(2).find('.comment p').text()).toEqual('Remember how Processing works?  setup() is executed once when the sketch starts and draw() loops forever and ever (until you quit).');
        expect($('.pair').eq(2).find('.code pre code').html()).toEqual('void setup() {\n  size(640,360);\n  background(255);\n}\n');
        expect($('.pair').eq(3).find('.comment').length).toBe(0);
        expect($('.pair').eq(3).hasClass('no-comment')).toBe(true);
        expect($('.pair').eq(3).find('.code pre code').html()).toEqual('\nvoid draw() {\n  background(255);\n\n');
        expect($('.pair').eq(4).find('.comment p').text()).toEqual('Move the ball according to its speed.');
        expect($('.pair').eq(4).find('.code pre code').html()).toEqual('  x = x + xspeed;\n  y = y + yspeed;\n');
        expect($('.pair').eq(5).find('.comment').length).toBe(0);
        expect($('.pair').eq(5).find('.code pre code').html()).toEqual('\n');
        expect($('.pair').eq(6).find('.comment p').text()).toEqual('Check for bouncing.');
        expect($('.pair').eq(6).find('.code pre code').html()).toEqual('  if ((x &gt; width) || (x &lt; 0)) {\n    xspeed = xspeed * -1;\n  }\n  if ((y &gt; height) || (y &lt; 0)) {\n    yspeed = yspeed * -1;\n  }\n');
        expect($('.pair').eq(7).find('.comment').length).toBe(0);
        expect($('.pair').eq(7).find('.code pre code').html()).toEqual('\n  stroke(0);\n  fill(175);\n');
        expect($('.pair').eq(8).find('.comment p').text()).toEqual('Display the ball at the location (x,y).');
        expect($('.pair').eq(8).find('.code pre code').html()).toEqual('  ellipse(x,y,16,16);\n}\n\n');
        done();
      }
    });
  });

  it('should add class to codesplit div', function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      files: ["book/content/lines.md"],
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/lines.html')).toString();
        var $ = cheerio.load(content);
        expect($('.codesplit.myclass').length).toEqual(1);
        done();
      }
    });
  });

  describe("lines", function() {

    function expectLines(el) {
      expect(el.find('.pair').length).toEqual(2);
      expect(el.find('.pair').eq(0).hasClass('no-comment')).toBeTruthy();
      expect(el.find('.pair').eq(0).find('.code pre code').html()).toEqual('var x = 100;\nvar y = 100;\n');
      expect(el.find('.pair').eq(1).find('.comment p').text()).toEqual('is executed once when the sketch starts. ');
      expect(el.find('.pair').eq(1).find('.code pre code').html()).toEqual('function setup() {\n');
    }

    it('should work on liquid tag', function(done) {
      var uid = triggerBuild({
        builds: [{ format: "html" }],
        files: ["book/content/lines.md"],
        finish: function() {
          var content = fs.readFileSync(path.join('tmp', uid, 'build1/lines.html')).toString();
          var $ = cheerio.load(content);
          expectLines($('.pairs').eq(0));
          done();
        }
      });
    })

    it('should work as data-lines attribute', function(done) {
      var uid = triggerBuild({
        builds: [{ format: "html" }],
        files: ["book/content/lines.md"],
        finish: function() {
          var content = fs.readFileSync(path.join('tmp', uid, 'build1/lines.html')).toString();
          var $ = cheerio.load(content);
          expectLines($('.pairs').eq(1));
          done();
        }
      });
    });

  });

});
