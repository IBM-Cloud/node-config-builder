var _ = require('underscore'),
    dot = require('dot-object');

function Configurator(config, props) {

    var substitutions = 0,
        not_found = [];

    var deepSearch = function(obj, search, manipulatorFn) {

        var searchFn = search;

        if (typeof searchFn !== 'function') {
            searchFn = function(value) {
                return value === search;
            };
        }

        _.each(obj, function (value, key) {

            if (typeof value !== 'object') {
                return searchFn(value) ? manipulatorFn(value, key, obj) : false;
            }

            deepSearch(value, search, manipulatorFn);
        });
    };

    var substituteStrings = function(str, obj) {

        var matches = str.match(/\$\{([a-zA-Z0-9._%]*)\}/g);

        matches.forEach(function(match) {
            substitutions++;
            var replacement = dot.pick(match.match(/\$\{([a-zA-Z0-9._%]*)\}/)[1], obj);

            if (replacement === void 0) {
                not_found.push(match);
                return;
            }

            if (typeof replacement === 'function') {
                replacement = replacement();
            }

            str = str.replace(match, replacement);
        });

        return str;

    };

    var init = function(config, props) {
        config = _.extend(config, props);
    };

    init(config, props);

    return {
        build: function() {
            // Turn strings into functions that replace themselves
            deepSearch(config, function (value) {
                return ('' + value).match(/\$\{([a-zA-Z0-9._%]*)\}/) !== null;
            }, function(value, key, obj) {
                obj[key] = function() { return substituteStrings(value, config); };
            });

            // Call function hierarchy to replace stuff
            deepSearch(config, function (value) {
                return typeof value === 'function';
            }, function(value, key, obj) {
                obj[key] = value();
            });

            return this.getConfig();
        },

        all: function() {
            return config;
        },

        getConfig: function() {
            return _.omit(config, Object.keys(props));
        },

        getStats: function() {
            return {
                substitutions: substitutions,
                not_found: not_found
            }
        },

        rawSubstitute: function(str) {
            return substituteStrings(str, config);
        }
    }

}

module.exports = Configurator;