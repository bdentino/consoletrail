var trails = [];
var util = require('util');

intercept_console(function(string, encoding, fd) {
  trails.forEach(function(papertrail) {
    papertrail(string);
  })
})

var papertrail = module.exports = function(options) {
  if (!options.host || !options.port) {
    throw new Error('Papertrail requires a host and a port!');
  }

  var winston = require('winston');
  var Papertrail = require('winston-papertrail').Papertrail;

  var ptOpts = {
      host: options.host,
      port: options.port,
      level: 'debug',
      colorize: true,
      logFormat: function(level, message) {
        return message;
      }
    }
  if (options.hostname) ptOpts.hostname = options.hostname
  if (options.program) ptOpts.program = options.program

  var logger
    , ptTransport = new Papertrail(ptOpts);

  ptTransport.on('error', function(err) {
    logger && logger.error(err);
  });

  ptTransport.on('connect', function(message) {
    logger && logger.info(message);
  });

  var logger = new winston.Logger({
    levels: {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    },
    transports: [
      ptTransport
    ]
  });

  var push = function push(message) {
    var colorRE = /\u001b\[(.*?)m/;
    var match = colorRE.exec(message);
    var code = '39';
    if (match && match.length > 1) {
      code = match[1];
      try{
        if (code == '90') code = '39'
        else if (code.startsWith && code.substring && code.startsWith('9')) code = '3'+code.substring(1);
      } catch (err) {
        logger.warn('[WARNING] Failed trying to push message with code ' + code);
      }
    }
    message = message.replace(/\u001b\[(.*?)m/i, '\u001b['+ code + 'm');
    logger.debug(message);
  }

  trails.push(push);

  return push
}

function intercept_console(callback) {
  var old_write_out = process.stdout.write
  var old_write_err = process.stderr.write

  process.stdout.write = (function(write) {
    return function(string, encoding, fd) {
      write.apply(process.stdout, arguments)
      callback(string, encoding, fd)
    }
  })(process.stdout.write)

  process.stderr.write = (function(write) {
    return function(string, encoding, fd) {
      write.apply(process.stderr, arguments)
      callback(string, encoding, fd)
    }
  })(process.stderr.write)

  return function() {
    process.stdout.write = old_write_out
    process.stderr.write = old_write_err
  }
}
