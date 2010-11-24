
# Express Lane

Get started building with [Express](http://expressjs.com/) fast.

Express Lane builds around these assumptions:

- View engine is handlebars.
- Settings are managed centrally and loaded on server object.
- Session handling is used.

## Requirements

- Node.js
- Connect
- Express
- hbs
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

    // settings.js: configuration for Express Lane and Express Lane modules.
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

    // Start express server via Express Lane
    require('expresslane').start();

    // Example: query settings for train module.
    var settings = require('expresslane').app.set('settings)('train);

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
