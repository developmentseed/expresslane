/**
 * Message handling.
 */
var Messages = function() {
    this.reset();
};

/**
 * Messages is an event emitter.
 */
Messages.prototype.on = require('events').EventEmitter.prototype.on;
Messages.prototype.emit = require('events').EventEmitter.prototype.emit;

/**
 * Reset messages.
 */
Messages.prototype.reset = function() {
    this._messages = [];
}

/**
 * Push a message.
 */
Messages.prototype.add = function(message) {
    this._messages.push(message);
};

/**
 * Render all messages to HTML.
 */
Messages.prototype.render = function(req, res) {
    this.emit('collect', this, req, res);
    return this._messages.join();
};

exports.Messages = Messages;
