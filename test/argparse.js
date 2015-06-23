require('mocha');
var expect = require('chai').expect;
var argparse = require('../lib/argparse');

describe('argparse', function() {

    describe('#parse()', function() {

        it('should return an object with a single empty array for ._', function() {

            var obj = argparse.parse();

            expect(obj).to.be.an('object');
            expect(obj._).to.be.an('array');
            expect(obj._).to.have.length(0);

        });

        it('should return an object with a single array for ._ with 3 values', function() {

            var obj = argparse.parse(['value1', 'value2', 'value3']);

            expect(obj).to.be.an('object');
            expect(obj._).to.be.an('array');
            expect(obj._).to.have.length(3);

        });

        it('should return an object with several simple key/value pairs', function() {

            var obj = argparse.parse(['--arg1', 'value1', '--arg2', 'value2', '--arg3', 'value3']);

            expect(obj).to.be.an('object');
            expect(obj._).to.be.an('array');
            expect(obj._).to.have.length(0);

            expect(obj.arg1).to.be.an('array');
            expect(obj.arg1).to.have.length(1);

            expect(obj.arg2).to.be.an('array');
            expect(obj.arg2).to.have.length(1);

            expect(obj.arg3).to.be.an('array');
            expect(obj.arg3).to.have.length(1);

        });

        it('should return an object with several complex key/value pairs', function() {

            var obj = argparse.parse(['--arg1', 'value1.1', 'value1.2', 'value1.3',
                '--arg2', 'value2', 'abcdefg', 'someothervalue', 'valuewithchars@()#(G#@@@@))!@#$%^&*()_',
                '--arg3', 'value3', 'value4']);

            expect(obj).to.be.an('object');
            expect(obj._).to.be.an('array');
            expect(obj._).to.have.length(0);

            expect(obj.arg1).to.be.an('array');
            expect(obj.arg1).to.have.length(3);

            expect(obj.arg2).to.be.an('array');
            expect(obj.arg2).to.have.length(4);

            expect(obj.arg3).to.be.an('array');
            expect(obj.arg3).to.have.length(2);

            expect(obj.arg2[3]).to.equal('valuewithchars@()#(G#@@@@))!@#$%^&*()_');

        });

    });

});