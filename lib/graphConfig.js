/**
 * @module graphConfig
 */

var graphLib = require('graphlib'),
    traverse = require('traverse'),
    util     = require('util'),
    assign   = require('lodash.assign'),
    omit     = require('lodash.omit');

function GraphConfig(config, properties) {

    var REFERENCE = '\\$\\{([a-zA-Z0-9._%]*)\\}',
        REFERENCE_RegExp  = new RegExp( REFERENCE ),
        MULTI_REFERENCE_RegExp = new RegExp( REFERENCE, 'g'),
        graph = new graphLib.Graph(),
        substitutions = 0,
        not_found = [],
        traversedConfig;


    var init = function(config, props) {
        config = assign(config, props);
        traversedConfig = traverse(config);
    };

    var getValuePathName = function(path) {
        return path.join('.');
    };

    var sub = function (match, varName) {

        var path = varName.split('.'),
            v    = traversedConfig.get(path);

        if (typeof v === 'undefined') {
            if (not_found.indexOf(varName) === -1) { // Don't push duplicate values into <not_found>
              not_found.push(varName);
            }
            return match;
        }

        if (typeof v !== 'string') {
            v = JSON.stringify(v);
        }

        // look for a reference in value
        if (REFERENCE_RegExp.test(v)) {
            console.log('depends: %s depends on %s', getValuePathName(this.valuePath), varName);
            graph.setEdge(getValuePathName(this.valuePath), varName);
            return match;
        }

        substitutions++;
        return v;
    };

    var process = function(value, valuePath) {

        var result = value.replace(MULTI_REFERENCE_RegExp, sub.bind({ value: value, valuePath: valuePath}));

        if (substitutions > 0) {
            traversedConfig.set(valuePath, result);
        }

        return result;
    };

    init(config, properties);

    return {
        build: function() {

            traversedConfig.forEach(function (value) {
                if (this.notLeaf) {
                    return;
                }

                if (typeof value !== 'string') {
                    return;
                }

                process(value, this.path);
            });

            if (not_found.length > 0) {
                throw new Error(util.format('%d referenced variables were not found:\n\t===> %s', not_found.length, not_found.join('\n\t===> ')));
            }

            if (!graphLib.alg.isAcyclic(graph)) {
                throw new Error('Config may not contain cyclic dependencies. The following were found: ' + graphLib.alg.findCycles(graph));
            }

            // Process the dependency graph to resolve all substitutions
            graphLib.alg.components(graph).forEach(function (component) {
                graphLib.alg.postorder(graph, component[0]).forEach(function (node) {
                    var path = node.split('.');
                    var old = traversedConfig.get(path);

                    var result = old.replace(MULTI_REFERENCE_RegExp, sub.bind({value: old, valuePath: path}));
                    if (result !== old) {
                        console.log('graph_update: %s: %s => %s', node, old, result);
                        traversedConfig.set(path, result);
                    }
                });
            });

            return this.getConfig();
        },

        all: function() {
            return config;
        },

        getConfig: function() {
            return omit(config, Object.keys(properties));
        },

        getStats: function() {
            return {
                substitutions: substitutions,
                not_found: not_found
            }
        },

        rawSubstitute: function(str) {

            str =  str.replace(MULTI_REFERENCE_RegExp, sub);

            if (not_found.length > 0) {
                throw new Error(util.format('%d referenced variables were not found:\n\t===> %s', not_found.length, not_found.join('\n\t===> ')));
            }

            return str;
        }
    }
}

module.exports = GraphConfig;
