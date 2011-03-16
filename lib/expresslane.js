/**
 * @fileoverview
 * Base infrastructure for an Express Lane application.
 */

var connect = require('connect'),
    express = require('express'),
    _ = require('underscore')._,
    sys = require('sys');

var app = new express.Server();

/**
 * Configures express server. Most of the time you'd want to use start() which
 * configures *and starts* an express server. This method is used for instance
 * for testing.
 *
 * @param {string} settingsPath
 *   Optionally specify path to a directory from which to load settings. If not
 *   given, settings modules will be looked for in node's module search path.
 *
 * @return
 *   The application server.
 */
function configure() {
    app.configure(function() {
        /**
         * Baseline config:
         */
        var settings = require('settings');
        // Add settings to the server

        Object.keys(app.settings).forEach( function(key) { 
            settings[key] = app.settings[key];
        })

        app.settings = settings;

        // Ensure sensible default for some settings.
        settings.port = settings.port || 8888;
        settings.siteTitle = settings.siteTitle || 'Express Lane';
        // Load environment specific settings overrides.
        try {
            var env = process.env.NODE_ENV || 'development';
            var overrides = require('settings.env.' + env);
            for (var k in overrides) {
                settings[k] = overrides[k];
            }
        } catch(error) {}

        // Use hbs (Express wrapper around handlebars.js) as template engine.
        app.set('view engine', 'hbs');

        app.set('view options', {
            blockHelpers: { 'if': function(conditional, block) {
                              if(!_.isEmpty(conditional)) {
                                  return block(this);
                              }
                              return '';
                          }}
        });

        // Required for session handling.
        app.use(express.cookieDecoder());

        // Reset statusMessages at start of request.
        app.use(function(req, res, next) {
            res.statusMessages = [];
            next();
        });

        // Set a layout if none is given and available.
        require('path').exists(process.cwd() + '/views/layout.hbs', function(exists) {
            if (!exists) {
                var viewOptions = app.set('view options') || {};
                if (!viewOptions.layout) {
                    viewOptions.layout = __dirname + '/views/layout';
                    app.set('view options', viewOptions);
                    console.log('Using default layout at ' + viewOptions.layout);
                }
            }
        });

        // Block region helpers.
        // Add blocks by adding .get helpers on the pages to add them,
        // and adding 'blocks:$region' listeners to the request object.
        var regions = app.set('block_regions') || ['menu', 'header', 'footer', 'left', 'right', 'content'];
        var helpers = _(regions).reduce(function(result, region) {
            result['blocks_' + region] = function(req, res) {
                var blocks = [];
                var show = {};
                req.emit('blocks:' + region, blocks);
                blocks.sort(function(a,b) {return a.weight - b.weight});
                blocks.forEach(function(block) {
                    block.content = block.content();
                });
                return blocks;
            };
            return result;
        }, {});

        // Populate dynamicHelpers (layout template variables)
        app.dynamicHelpers(_.extend(helpers, {
            bodyClasses: function(req, res) {
                var classes = [];
                if (req.url === '/') {
                    classes.push('front');
                }
                var path = [];
                req.url.split('/').forEach(function(arg) {
                    if (arg) {
                        path.push(arg);
                        classes.push(path.join('-'));
                    }
                });
                return classes.join(' ');
            },
            siteTitle: function(req, res) {
                return settings.siteTitle;
            },
            siteSlogan: function(req, res) {
                return settings.siteSlogan;
            },
            entitiesRoot: function() {
                return settings.entitiesRoot;
            },
            statusMessage: function(req, res) {
                app.emit('renderStatusMessages', req, res);
                return res.statusMessages.join();
            },
            footerMessage: function() {
                return settings.footerMessage;
            },
            analytics: function() {
                return settings.analyticsId;
            },
            feedbackMessage: function() {
                return settings.feedbackMessage;
            },
            flashMessage: function(req, res){
                return function(){
                    var buf = [], 
                        messages = req.flash(),
                        types = Object.keys(messages), 
                        len = types.length;

                    if (!len) return '';
                    buf.push('<div id="messages">');
                    for (var i = 0; i < len; ++i) {
                        var type = types[i], 
                            msgs = messages[type];

                        if (msgs) {
                            buf.push('  <ul class="' + type + '">');
                            for (var j = 0, len = msgs.length; j < len; ++j) {
                                var msg = msgs[j];
                                buf.push('    <li>' + msg + '</li>');
                            }
                            buf.push('  </ul>');
                        }
                    }
                    buf.push('</div>');
                    return buf.join('\n');
                }
            },
            template: function(req, res) {
                return function(content) {
                    if (typeof content !== 'array') {
                        content = [content];
                    }
                    var out = [];
                    content.forEach(function(v) {
                        if (typeof v === 'string') {
                            out.push(v);
                        }
                        else if (v && v._template) {
                          options = { layout: false, locals: v};
                          res.render(v._template, options, function(err, str){
                              out.push(str);
                          });
                        }
                    });
                    return out.join("\n");
                };
            },
            link: function(req, res) {
                var URL = require('url');
                return function(content) {
                    if (typeof content === 'string') {
                        return content;
                    }
                    else {
                        var ret = '';
                        var href = URL.parse(content.path);
                        if (href.protocol || href.pathname[0] === '/') {
                            ret = href.href;
                        }
                        else {
                            ret = '/' + content.path;
                        }
                        var ret = '<a href="' + ret + '">';
                        ret += strip_tags(content.title);
                        ret += '</a>';
                        return ret;
                    }
                }
            }
        }));
    });

    /**
     * DEVELOPMENT (default) config:
     *
     * 1. Log message output for each request.
     * 2. Static file serving from /public directory (for CSS, JavaScript, images)
     */
    app.configure('development', function() {
        console.log('Using development configuration.');
        app.use(connect.logger({ format: '- [:response-timems] :date - :method :status - :url' }));
        app.use(connect.staticProvider(process.cwd() + '/public'));
        // TODO: Move this to user module. Problem: configuring session middleware in user.js
        // makes tests fail (reproduce by moving both the configuration of cookie decoder and
        // the configuration of the session handler to user.js)
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex')
        }));
    });

    /**
     * PRODUCTION config:
     */
    app.configure('production', function() {
        console.log('Using production configuration.');
        app.use(connect.logger({ format: '- [:response-timems] :date - :method :status - :url' }));
        app.use(connect.staticProvider(process.cwd() + '/public'));
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex')
        }));
    });

    /**
     * TEST config:
     */
    app.configure('test', function() {
        console.log('Using test configuration.');
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex'),
            store: new express.session.MemoryStore({ reapInterval: -1 })
        }));
    });
    return app;
}

/**
 * Configures and starts an express server.
 *
 * @param {string} settingsPath
 *   Optionally specify path to a directory from which to load settings. If not
 *   given, settings modules will be looked for in node's module search path.
 *
 * @return
 *   The application server.
 */
var start = function(settingsPath) {
    app.listen(app.set('port'));
    console.log('Express server started on port %s', app.address().port);
    return app;
};


/**
 * Error: AccessDenied
 */
AccessDenied = function(msg){
    this.name = 'AccessDenied';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}
sys.inherits(AccessDenied, Error);

/**
 * Error: NotFound
 */
NotFound = function(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}
sys.inherits(NotFound, Error);

/**
 * Returns path to a view.
 *
 * Views can be overridden in settings.
 * TODO: Reconsider this pattern. To what extent do we need to offer a central
 * entry point for modifying views / render behavior?
 */
var view = function(name) {
    if (app.settings.viewsOverrides) {
        if (app.settings.viewsOverrides[name]) {
            return app.settings.viewsOverrides[name];
        }
    }
    return __dirname + '/views/' + name;
}

/**
 * Strip HTML tags, from node-markdown.
 *
 * TODO: needs a better home.
 *
 * @param {string} o HTML string.
 * @param {string} allowedTags Allowed HTML tags in the form of "tag1|tag2|tag3".
 * @param {object} allowedAttributes Allowed attributes for specific tags
 *   format: {"tag1":"attrib1|attrib2|attrib3", "tag2":...}
 *   wildcard for all tags: "*".
 * @return String with disallowed html removed.
 */
var strip_tags = function(html /*, allowedTags, allowedAttributes */) {
    var allowedTags = arguments[1] ||
            'a|b|blockquote|code|del|dd|dl|dt|em|h1|h2|h3|' +
            'i|img|li|ol|p|pre|sup|sub|strong|strike|ul|br|hr|' +
            'table|thead|th|tbody|tr|td|div|span',
        allowedAttributes = arguments[2] || {
            'img': 'src|width|height|alt',
            'a': 'href',
            'table': 'cellspacing',
            '*': 'title|id|class'
        };
        testAllowed = new RegExp('^(' + allowedTags.toLowerCase() + ')$'),
        findTags = /<(\/?)\s*([\w:\-]+)([^>]*)>/g,
        findAttribs = /(\s*)([\w:-]+)\s*=\s*(["'])([^\3]+?)(?:\3)/g;

    // convert all strings patterns into regexp objects
    for (var i in allowedAttributes) {
        if (allowedAttributes.hasOwnProperty(i)) {
            allowedAttributes[i] = new RegExp('^(' +
                allowedAttributes[i].toLowerCase() + ')$');
        }
    }

    // find and match html tags
    return html.replace(findTags, function(original, lslash, tag, params) {
        var tagAttr, wildcardAttr,
            rslash = params.substr(-1) == '/' && '/' || '';

        tag = tag.toLowerCase();

        // tag is not allowed, return empty string
        if (!tag.match(testAllowed))
            return '';

        // tag is allowed
        else {
            // regexp objects for a particular tag
            tagAttr = tag in allowedAttributes && allowedAttributes[tag];
            wildcardAttr = '*' in allowedAttributes && allowedAttributes['*'];

            // if no attribs are allowed
            if (!tagAttr && !wildcardAttr)
                return '<' + lslash + tag + rslash + '>';

            // remove trailing slash if any
            params = params.trim();
            if (rslash) {
                params = params.substr(0, params.length - 1);
            }

            // find and remove unwanted attributes
            params = params.replace(findAttribs, function(original, space,
                                                            name, quot, value) {
                name = name.toLowerCase();

                // force javascript: links to #
                if (name == 'href' && value.trim().substr(0,
                        'javascript:'.length) == 'javascript:') {
                    value = '#';
                }

                if ((wildcardAttr && name.match(wildcardAttr)) ||
                        (tagAttr && name.match(tagAttr))) {
                    return space + name + '=' + quot + value + quot;
                }else
                    return '';
            });

            return '<' + lslash + tag + (params ? ' ' + params : '') + rslash + '>';
        }
    });
};

// Export.
module.exports = {
    start: start,
    app: app,
    configure: configure,
    view: view,
    strip_tags: strip_tags
};
