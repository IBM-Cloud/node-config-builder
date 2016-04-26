#!/usr/bin/env node

var fs    = require('fs'),
    path  = require('path'),
    properties = require('properties'),
    argParse = require('../lib/argparse'),
    Configurator = require('../lib/graphConfig'),
    nconf = require('nconf'),
    pconf = new nconf.Provider(),
    EOL = require('os').EOL;

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

function loadFiles(files, confTarget) {

    // Short-circuit if <files> isn't populated
    if (!files) { return; }

    var conf = confTarget || nconf;

    files.forEach(function(file) {
        conf.add(path.normalize(file), {
            type: 'file',
            file: path.normalize(file),
            format: formats[path.extname(file)]   // Might be undefined, which is OK (defaults to .json)
        });
    });
}

// Save the entire configuration out as a properties file that we can use within ant
function jsonToProps(obj, namespace) {
    var propsOutput = '';

    if (typeof obj !== 'string' && typeof obj !== 'number' && !(obj instanceof Date)) {

        var currentNamespace = namespace === undefined ? '' : namespace + '.';

        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) { continue; }
            propsOutput += jsonToProps(obj[key], currentNamespace + key);
        }

        return propsOutput;
    }

    // Base case
    return namespace + '=' + obj + '\n';
}

var options = argParse.parse(process.argv);

// If the user requested help, or if there's nothing to do, just display usage information.
if (typeof options.help !== 'undefined' || options.count === 0) {
	var wsize = require('window-size'),
		ui = require('cliui')({
			width: wsize.width ? Math.min(80, wsize.width) : null
		});

	ui.div('Usage: $0 [--option] [values]');

	ui.div({
	  text: 'Options (all are optional):',
	  padding: [1, 0, 0, 0]
	});

	ui.div({
    	text: "--configFiles",
    	width: 40,
    	padding: [0, 4, 0, 4]
    }, {
		text: "One or more JSON files to be compiled hierarchically. Load priority is last to first.",
	    width: 60
  	});

  	ui.div({
    	text: "--propertyFiles",
    	width: 40,
    	padding: [0, 4, 0, 4]
    }, {
		text: "One or more key/value files to be compiled hierarchically. Load priority is last to first.",
	    width: 60
  	});

  	ui.div({
    	text: "--configOut",
    	width: 40,
    	padding: [0, 4, 0, 4]
    }, {
		text: "File or directory to which the compiled JSON config file should be written.",
	    width: 60
  	});

  	ui.div({
    	text: "--propertiesOut",
    	width: 40,
    	padding: [0, 4, 0, 4]
    }, {
		text: "File or directory to which a compiled .properties file should be written.",
	    width: 60
  	});

  	ui.div({
    	text: "--filePairs",
    	width: 40,
    	padding: [0, 4, 0, 4]
    }, {
		text: "A pair of files consisting of an input file that property references and an output file or directory to which the result should be written. Properties will be resolved via the config and property files specified above.",
	    width: 60
  	});

  	console.log(ui.toString());
	return process.exit(0);
}

// Allow passing properties via the command line, removing the array-ness if a single value
var propDefaults = {};
for (var key in options) {
    if (!options.hasOwnProperty(key)) { continue; }

    if (options[key].length === 1) {
        propDefaults[key] = options[key][0];
    } else {
        propDefaults[key] = options[key];
    }

}

pconf.defaults(propDefaults);

loadFiles(options.configFiles);
loadFiles(options.propertyFiles, pconf);

// Get the raw objects from nconf, stripping out nconf's extraneous elements.
// http://stackoverflow.com/questions/13468683/can-i-dump-the-current-nconf-configuration-to-an-object
var config = nconf.get() || {};
var props  = pconf.get() || {};

delete props.$0;
delete props._;

delete config.$0;
delete config._;

console.log('Building configs...');

var configurator = Configurator.createConfig(config, props);
config = configurator.build();
var configStats = configurator.getStats();

var log = configStats.not_found.length > 0 ? console.error : console.log;
log('%d substitutions, %d not found: %s', configStats.substitutions, configStats.not_found.length, configStats.not_found);

if (configStats.not_found.length > 0) {
    process.exit(1);
}

var outputs = [];
if (options.configOut) {
    console.log('Writing config output file %s', options.configOut[0]);
    fs.writeFileSync(options.configOut[0], JSON.stringify(config, null, 4));
    outputs.push(options.configOut[0]);
}

if (options.propertiesOut) {
    console.log('Writing properties output file %s', options.propertiesOut[0]);
    fs.writeFileSync(options.propertiesOut[0], jsonToProps(config));
    outputs.push(options.propertiesOut[0]);
}

if (options.filePairs) {

    if (options.filePairs.length %2 !== 0) {
        return console.error('`filePairs` requires an even number of elements');
    }

    var pairs = [];
    options.filePairs.forEach(function(file, index) {
        if (index % 2 === 0) {
            return pairs.push({
                inputFile: file
            });
        }

        pairs[pairs.length - 1].outputFile = file;
    });

    pairs.forEach(function(pair) {
        console.log('Processing input file %s to output file %s', pair.inputFile, pair.outputFile);
        var fString = fs.readFileSync(pair.inputFile).toString();
        fString = configurator.rawSubstitute(fString);
        fs.writeFileSync(pair.outputFile, fString);
        outputs.push(pair.outputFile);
    });

}

console.log('The following files were written:');
console.log(outputs.map(function(outFile) { return path.resolve(outFile); }).join(EOL));

console.log('Done.');
