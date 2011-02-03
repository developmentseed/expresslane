/**
 * Message handling.
 */
var Messages = function() {
    this.reset();
};

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
    return this._messages.join();
};

exports.Messages = Messages;
