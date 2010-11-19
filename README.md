
# Express Lane

Get started building with [Express](http://expressjs.com/) fast.

Express Lane builds around these assumptions:

- View engine is handlebars.
- Database backend is CouchDB interfaced by [Cradle](https://github.com/cloudhead/cradle).
- Settings are managed centrally and loaded on server object.
- Session handling is used.

## Requirements

- Node.js
- Connect
- Express
- Cradle
- A settings module that exports settings as an anonymous object:

    module.exports = {
        // My settings
    };

## Express lane settings variables

- modules (array of modules to be required on start)
- port
- publicHostname
- Layout template variables
 - siteTitle
 - siteSlogan
 - entitiesRoot
 - footerMessage
 - analytics
 - feedbackMessage

## Custom settings

- Organize custom settings by module name. I. e. your module should expect
  settings at `settings.mymodule`.

## Usage

    // settings.js - configure express server.
    module.exports = {
        modules: [
            'train'
        ],
        train: {
            cars: 12,
            number: 502
        }
        port: 8080,
        siteTitle: 'Transport'
    };

    // app.js - start express server.
    require('expresslane').start(__dirname);

    // train.js - query settings.
    var settings = require('expresslane').app.set('settings)('train);

    // Start application.
    node app.js

## Directory structure

- `/public` - static files

## Environment dependent settings

Additionally to settings.js, environment dependent settings can be specified
in modules named

    settings.env.ENV_NAME.js

So if the application is started with `NODE_ENV=production node app.js` a file
`settings.env.production.js` will be looked for and - if present - its
values would be added to the ones defined in settings.js. If a value with the
same key already exists in settings.js it will be overridden.
