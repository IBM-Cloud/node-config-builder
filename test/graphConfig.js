var GraphConfig = require('../lib/graphConfig');
var test = require('tape');
var fs = require('fs');
var path = require('path');
var properties = require('properties');
var nconf = require('nconf');

nconf.file('base', __dirname + '/mocks/prod.json');
nconf.file('prod', __dirname + '/mocks/base.json');

var baseConfig = nconf.get();
delete baseConfig._;
delete baseConfig.$0;
var props = properties.parse(fs.readFileSync(__dirname + '/mocks/prod.properties', 'utf8'), { 'namespaces': true });

test('build a config based on some properties', function(t) {

    t.plan(3);

    var config;

    try {
        config = GraphConfig(baseConfig, props).build();
    } catch(ex) {
        t.fail('A problem occurred building the configuration');
        console.error(ex);
    }

    t.equal(config.env, 'prod');
    t.equal(config.services.database, 'appdb-prod.mycompany.com', 'config.services.database should === appdb-prod.mycompany.com');
    t.equal(config.db_config.password, 'myreallysecureprodpassword', 'config.db_config.password should === myreallysecureprodpassword');
});
