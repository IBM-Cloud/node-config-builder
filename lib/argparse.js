/* BEGIN POLYFILLS */
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.lastIndexOf(searchString, position) === position;
    };
}
/* END POLYFILLS */

function ArgParse() {}

function stripDashes(str) {
    var chars = str.split('');

    chars.every(function(char, index) {
        if (char === '-') {
            delete chars[index];
            return true;
        }

        return false;
    });

    return chars.join('');
};

ArgParse.prototype.parse = function(args) {

    var argMap = {
        '_': []
    };

    var currentArg = void 0;
    args.forEach(function(arg) {

        // This is the next supplied option
        if (arg.startsWith('-') || arg.startsWith('--')) {
            currentArg = stripDashes(arg);

            if (!argMap[currentArg]) {
                argMap[currentArg] = [];
            }
            return;
        }

        if (!currentArg) {
            return argMap._.push(arg);
        }

        argMap[currentArg].push(arg);

    });

    return argMap;

};

module.exports = new ArgParse();