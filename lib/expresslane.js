/**
 * @fileoverview
 * Base infrastructure for an Express Lane application.
 */
var connect = require('connect'),
    express = require('express'),
    settings = require('settings');

var app = new express.Server();

/**
 * Initializes the express server.
 *
 * @param {dirname}
 *   The base directory of the application.
 *
 * @return
 *   The application server.
 */
var init = function(dirname) {

    /**
     * Baseline config:
     */
    app.configure(function() {
        // Add settings to the server
        app.set('settings', function(id) { return settings[id]; });

        // Ensure sensible default for some settings.
        settings.port = settings.port || 8888;
        settings.publicHostname = settings.publicHostname || '127.0.0.1:8888';
        settings.siteTitle = settings.siteTitle || 'Express Lane';

        // Use hbs (Express wrapper around handlebars.js) as template engine.
        app.set('view engine', 'hbs');

        // Populate dynamicHelpers (layout template variables)
        app.dynamicHelpers({
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
            footerMessage: function() {
                return settings.footerMessage;
            },
            analytics: function() {
                return settings.analyticsId;
            },
            feedbackMessage: function() {
                return settings.feedbackMessage;
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
                var strip_tags = require('entry').strip_tags;
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
        });
    });

    /**
     * DEVELOPMENT (default) config:
     *
     * 1. Log message output for each request.
     * 2. Static file serving from /public directory (for CSS, JavaScript, images)
     */
    app.configure('development', function() {
        app.use(connect.logger({ format: '- [:response-timems] :date - :method :status - :url' }));
        app.use(connect.staticProvider(dirname + '/public'));
        app.use(require('couchAttachmentProvider')({database: 'votes', prefix: 'candidate/image'}));

        /**
         * Enable cookie decoder, enable session handling.
          * TODO - Figure out how to move this to user? Tests don't like late
          * session configuration in user.js.
         */
        app.use(express.cookieDecoder());
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex')
        }));
    });

    /**
     * PRODUCTION config:
     */
    app.configure('production', function() {
        console.log('Using production config.');
        settings.tileLiveHostname = 'ndi1.live.mapbox.com';
        settings.publicHostname = 'afghanistan.devseed.com';
        app.use(connect.logger({ format: '- [:response-timems] :date - :method :status - :url' }));
        app.use(connect.staticProvider(dirname + '/public'));
        app.use(require('couchAttachmentProvider')({database: 'votes', prefix: 'candidate/image'}));

        /**
         * Enable cookie decoder, enable session handling.
         */
        app.use(express.cookieDecoder());
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex')
        }));
    });

    /**
     * TEST config:
     */
    app.configure('test', function() {
        app.use(require('couchAttachmentProvider')({database: 'votes', prefix: 'candidate/image'}));

        /**
         * Enable cookie decoder, enable session handling.
         */
        app.use(express.cookieDecoder());
        app.use(express.session({
            secret: require('crypto').createHash('md5').update(Math.random()).digest('hex'),
            store: new express.session.MemoryStore({ reapInterval: -1 })
        }));
    });

    return app;
};

// Export.
module.exports = {
    init: init,
    app: app,
    settings: settings
};
