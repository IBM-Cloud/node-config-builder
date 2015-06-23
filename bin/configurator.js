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

// If there's nothing to do, don't do anything.
if (process.argv.length <= 2) {
    console.error('Nothing to do!');
    process.exit(1);
}

var options = argParse.parse(process.argv);

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

var configurator = Configurator(config, props);
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
