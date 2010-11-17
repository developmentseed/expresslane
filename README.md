
# Express Lane

Express based framework for building web applications. Adds a couple of
assumptions on top of [Express](http://expressjs.com/) that make building
websites faster.

- View engine is handlebars.
- Database backend is CouchDB interfaced by cradle.
- Settings are managed centrally and loaded on server object.
- Session handling is used.

Aside from sensible default for the above assumptions, Express Lane offers
these features:

- TODO

## Requirements

- Express
- A settings module that exports settings as an anonymous object:

    module.exports = {
      port: 8888
    };

## Default settings variables

## Custom settings

- Organize custom settings by module name. I. e. your module should expect
  settings at `settings.mymodule`.

## Usage

// TODO