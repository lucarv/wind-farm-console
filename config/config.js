var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'vkConsole'
    },
    port: process.env.PORT || 3300,
  },

  test: {
    root: rootPath,
    app: {
      name: 'vkConsole'
    },
    port: process.env.PORT || 3300,
  },

  production: {
    root: rootPath,
    app: {
      name: 'vkConsole'
    },
    port: process.env.PORT,
  }
};

module.exports = config[env];
