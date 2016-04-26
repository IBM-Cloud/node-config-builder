var debug = require('debug');

var REFERENCE = '\\$\\{([a-zA-Z0-9._%]*)\\}',
    REFERENCE_RegExp  = new RegExp( REFERENCE );

function getValuePathName(path) {
    return path.join('.');
}

module.exports = function(config) {

    return function (match, varName) {

        var path = varName.split('.'),
            // First check the config to see if we can find the value
            v = config.traversedConfig.get(path);

        if (typeof v === 'undefined') {
            path.splice(0, 0, '_properties');
            v = config.traversedConfig.get(path);
        }

        // Couldn't find the referenced value anywhere, so track the list
        if (typeof v === 'undefined') {
            if (config.not_found.indexOf(varName) === -1) { // Don't push duplicate values into <not_found>
              config.not_found.push(varName);
            }
            return match;
        }

        if (typeof v !== 'string') {
            v = JSON.stringify(v);
        }

        // look for a reference in value
        if (REFERENCE_RegExp.test(v)) {
            debug('depends: %s depends on %s', getValuePathName(this.valuePath), varName);
            config.graph.setEdge(getValuePathName(this.valuePath), varName);
            return match;
        }

        config.substitutions++;
        return v;
    };

};
