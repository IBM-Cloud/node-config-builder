var GraphConfig = require('../lib/graphConfig');
var test = require('tape');
var fs = require('fs');
var path = require('path');
var assign = require('lodash.assign');
var properties = require('properties');
var nconf = require('nconf');

var formats = {
    '.properties' : {
        parse: function(data) {
            return properties.parse(data, {
                'namespaces': true
            });
        },
        stringify: properties.stringify
    }
};

function initConfigLayers(opts) {

	var conf = new nconf.Provider();
	var defaultPropFile = __dirname + '/mocks/prod.properties';

	conf.file('base', __dirname + '/mocks/prod.json');
	conf.file('prod', __dirname + '/mocks/base.json');
	
	var props = new nconf.Provider();
	props.add(path.normalize(defaultPropFile), {
		type: 'file',
		file: path.normalize(defaultPropFile),
		format: formats[path.extname(defaultPropFile)]   // Might be undefined, which is OK (defaults to .json)
	});
	
	// Process additional config or properties files for a given test
	if (opts && typeof opts.configFiles !== 'undefined') {
		opts.configFiles.forEach(function(file) {
			conf.file(path.basename(file), file);
		});
	}
	
	if (opts && typeof opts.propFiles !== 'undefined') {
		opts.propFiles.forEach(function(file) {
			props.add(path.normalize(file), {
				type: 'file',
				file: path.normalize(file),
				format: formats[path.extname(file)]   // Might be undefined, which is OK (defaults to .json)
			});
		});
	}	
	
	var baseConfig = conf.get();
	delete baseConfig._;
	delete baseConfig.$0;
	
	var baseProps = props.get();
	delete baseProps._;
	delete baseProps.$0;
	
	return {
		config: baseConfig,
		props: baseProps
	}

}

test('build a config based on some properties', function(t) {

    t.plan(3);

    var config;
    
    var layers = initConfigLayers();

    try {
        config = GraphConfig(layers.config, layers.props).build();
    } catch(ex) {
        t.fail('A problem occurred building the configuration');
        console.error(ex);
    }

    t.equal(config.env, 'prod');
    t.equal(config.services.database, 'appdb-prod.mycompany.com', 'config.services.database should === appdb-prod.mycompany.com');
    t.equal(config.db_config.password, 'myreallysecureprodpassword', 'config.db_config.password should === myreallysecureprodpassword');
});

test('throw an error if circular dependencies are found in config', function(t) {
	
	var config,
		layers = initConfigLayers({
			configFiles: [
				__dirname + '/mocks/circular.json'
			]
		});
		
	try {
		config = GraphConfig(layers.config, layers.props).build();
		t.fail('Graph failed to catch circular references in config');
	} catch(ex) {
		t.pass('Circular references in config were caught');
	}
	
	t.end();
	
});

test('throw an error if circular dependencies are found between config and properties', function(t) {

	var config,
		layers = initConfigLayers({
			configFiles: [
				__dirname + '/mocks/config-prop-cycle.json'
			],
			
			propFiles: [
				__dirname + '/mocks/config-prop-cycle.properties'
			]
		});
		
	try {
		config = GraphConfig(layers.config, layers.props).build();
		t.fail('Graph failed to catch circular references between config and properties');
	} catch(ex) {
		t.pass('Circular references between config and properties were caught');
	}
	
	t.end();

});