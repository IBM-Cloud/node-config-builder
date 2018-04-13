/**
 * @module graphConfig
 */

var graphLib = require('graphlib'),
    traverse = require('traverse'),
    util     = require('util'),
    assign   = require('lodash.assign'),
    omit     = require('lodash.omit'),
    substitute = require('./substitute');

var REFERENCE = '\\$\\{([a-zA-Z0-9._%]*)\\}',
    MULTI_REFERENCE_RegExp = new RegExp( REFERENCE, 'g');

function GraphConfig(config, props) {
    this.graph = new graphLib.Graph();
    this.substitutions = 0;
    this.not_found = [];
    this.traversedConfig = void 0;

    this.init(config, props);
}

GraphConfig.prototype._process = function(value, valuePath) {

    var result = value.replace(MULTI_REFERENCE_RegExp, substitute(this).bind({ value: value, valuePath: valuePath}));

    if (this.substitutions > 0) {
        this.traversedConfig.set(valuePath, result);
    }

    return result;
};

GraphConfig.prototype.init = function(config, props) {
	this.config = assign(config, {
		_properties: props
	});

	this.traversedConfig = traverse(config);
};

GraphConfig.prototype.build = function() {

    var _self = this;

    this.traversedConfig.forEach(function (value) {
        if (this.notLeaf) {
            return;
        }

        if (typeof value !== 'string') {
            return;
        }

        _self._process(value, this.path);
    });

    if (this.not_found.length > 0) {
        throw new Error(util.format('%d referenced variables were not found:\n\t===> %s', this.not_found.length, this.not_found.join('\n\t===> ')));
    }

    if (!graphLib.alg.isAcyclic(this.graph)) {
        throw new Error('Config may not contain cyclic dependencies. The following were found: ' + graphLib.alg.findCycles(this.graph));
    }

    // Process the dependency graph to resolve all substitutions
    graphLib.alg.components(this.graph).forEach(function (component) {
        graphLib.alg.postorder(_self.graph, component[0]).forEach(function (node) {
            var path = node.split('.');
            var old = _self.traversedConfig.get(path);

            var result = old.replace(MULTI_REFERENCE_RegExp, substitute(_self).bind({value: old, valuePath: path}));
            if (result !== old) {
                debug('graph_update: %s: %s => %s', node, old, result);
                _self.traversedConfig.set(path, result);
            }
        });
    });

    return this.getConfig();
};

GraphConfig.prototype.getConfig = function() {
    return omit(this.config, '_properties');
};

GraphConfig.prototype.getStats = function() {
	return {
		substitutions: this.substitutions,
		not_found: this.not_found
	};
};

GraphConfig.prototype.all = function() {
    return this.config;
};

GraphConfig.prototype.rawSubstitute = function(str) {

    str = str.replace(MULTI_REFERENCE_RegExp, substitute(this));

    if (this.not_found.length > 0) {
        throw new Error(util.format('%d referenced variables were not found:\n\t===> %s', this.not_found.length, this.not_found.join('\n\t===> ')));
    }

    return str;
};

function createConfig(config, props) {
	return new GraphConfig(config, props);
}





module.exports = {
	createConfig: createConfig
};
