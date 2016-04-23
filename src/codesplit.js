var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');
var tinyliquid = require('tinyliquid');
var through = require('through2');

var Plugin = function(registry) {
  this.cache = {};
  registry.before('load', 'codesplit:liquid', _.bind(this.parseLiquid, this));
  registry.after('markdown:convert', 'codesplit:inline', _.bind(this.parseInline, this));
};

Plugin.prototype = {

  parseExample: function(code) {

    var opt = {} // no op for now
    var div = cheerio.load('<div class="codesplit"><div class="codesplit-content"></div></div>');
    var box = div('.codesplit-content');

    // If we want to display just a part of this example,
    // let's look for the start and finish lines and use
    // only those.
    if(opt.pick) {
      var startIndex = code.indexOf(opt.pick.start)
      var stopIndex = code.indexOf(opt.pick.stop)
      if(startIndex > -1 && stopIndex > -1) {
        code = code.substring(startIndex, stopIndex + opt.pick.stop.length);
      }
      else {
        console.log("pick values not found");
      }
    }

    var split = code.split('\n');

    // When picking values, we often pick lines that are indented. For those
    // lines not to have extra space on the left, let's remove the amount of
    // whitespace from all lines based on the whitespace from the first line.
    var padnum = split[0].search(/\S|$/);
    var regex = new RegExp("^\\s{"+padnum+"}");
    if(padnum > 0) {
      split = _.map(split, function(line) {
        return line.replace(regex, '');
      });
    }

    // if the first line was a linebreak, let's get rid of it.
    // allows people to not have <pre> and code on same line.
    if(split[0] == '') split.shift();

    // Loop through every line and create pair objects with
    // .code and .comment arrays holding the lines.
    var pairs = [];
    var lastType;
    for(var i = 0; i < split.length; i++) {

      // what type of line is this?
      var type = split[i].match(/^\s*\/\//) ? "comment" : "code";
      var pair = pairs[pairs.length-1];

      // should we create a new pair?
      if(!pair || (lastType == "code" && type == "comment") || (pair.maxLines && pair.code.length >= pair.maxLines)) {
        pair = { code:[], comment:[], klass:[] };
        pairs.push(pair);
      }

      // Parse attributes if comment
      if(type == "comment") {
        var regex = /\{(.+)\}/;
        var match = regex.exec(split[i]);
        if(match) {
          var vals = match[1].trim().split(' ');
          _.each(vals, function(val) {
            if(val.charAt(0) === '#') pair.id = val.substring(1);
            if(val.charAt(0) === '.') pair.klass.push(val.substring(1));
            if(val.charAt(0) === '!') pair.maxLines = parseInt(val.substring(1));
          });
          split[i] = split[i].replace(regex, '');
        }
      }

      lastType = type;

      pair[type].push(split[i]);
    }

    // Loop through every pair
    for(var i = 0; i < pairs.length; i++) {

      var pair = pairs[i];

      // Create a new pair element
      box.append('<div class="codesplit-pair"></div>');
      var jpair = box.find('.codesplit-pair').last();

      // Add attributes from object
      if(pair.id)                  jpair.attr('id', pair.id);
      if(pair.klass.length > 0)    jpair.addClass(pair.klass.join(' '));
      if(pair.comment.length == 0) jpair.addClass('codesplit-nocomment');

      // Create comments
      if(pair.comment.length > 0) {
        var para = _.map(pair.comment, function(line) {
          return line.replace('//', '').trim();
        }).join(' ');
        jpair.append('<div class="codesplit-comment"><p>'+para+'</p></div>');
      }

      // Create code
      var codes = pair.code.join('\n');
      // if this is going to be shows as one big field
      // let's preserve the exact spacing.
      if(opt.keepLastLinebreak) {
        codes += '\n';
      }
      jpair.append('<div class="codesplit-code"><pre><code>' + codes + '</code></pre></div>');

    }

    return div.html();
  },

  getExample: function(examplePath) {

    // only load if not in cache
    if(!this.cache[examplePath]) {
      this.cache[examplePath] = fs.readFileSync(examplePath).toString();
    }

    // parse example
    return this.parseExample(this.cache[examplePath]);
  },

  // Plugin functions
  // ---------------------------------------------

  parseLiquid: function(config, extras, callback) {
    var that = this;
    _.set(config, 'liquid.customTags.codesplit', function(context, tag, example) {

      if(!_.get(config, 'codesplit.includes')) {
        return console.log('WARNING: No codesplit include folder set')
      }

      var examplePath = path.join(config.codesplit.includes, example);
      var ast = tinyliquid.parse(that.getExample(examplePath))
      context.astStack.push(ast);
    });
    callback(null, config, extras);
  },

  parseInline: function(config, stream, extras, callback) {

    var that = this;

    // loop through all files and find codesplit classes
    // that haven't yet been parsed.
    stream = stream.pipe(through.obj(function(file, enc, cb) {

      var changed = false;
      file.$el = file.$el || cheerio.load(file.contents.toString());

      file.$el('.codesplit').each(function() {
        var jel = file.$el(this);
        if(jel.find('.codesplit-content').length == 0) {
          changed = true;
          jel.replaceWith(that.parseExample(jel.html()));
        }
      });

      if(changed) file.contents = new Buffer(file.$el.html());

      cb(null, file);
    }));

    callback(null, config, stream, extras);
  }

}

module.exports = Plugin;
