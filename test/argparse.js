var argparse = require('../lib/argparse');
var test = require('tape');

test('parse zero arguments', function(t) {
	t.plan(3);
	
	var obj = argparse.parse();
	
	t.equal(typeof obj, 'object', 'obj should be an object');
	t.ok(Array.isArray(obj._), 'obj._ should be an array');
	t.equal(obj.count, 0, 'obj.count should be length 0');
});

test('parse 3 un-named arguments', function(t) {
	t.plan(1);
	
	var obj = argparse.parse(['value1', 'value2', 'value3']);
	
	t.equal(obj._.length, 3, 'obj._ should have length 3');
});

test('parse multiple options with single arguments', function(t) {
	t.plan(3);
	
	var obj = argparse.parse(['--arg1', 'value1', '--arg2', 'value2', '--arg3', 'value3']);
	
	t.deepEqual(obj.arg1, ['value1'], 'obj.arg1 should === value1');
	t.deepEqual(obj.arg2, ['value2'], 'obj.arg2 should === value2');
	t.deepEqual(obj.arg3, ['value3'], 'obj.arg3 should === value3');
});

test('parse multiple options with multiple arguments', function(t) {
	t.plan(2);
	
	var obj = argparse.parse(['--arg1', 'value1.1', 'value1.2', 'value1.3',
                '--arg2', 'value2', 'abcdefg', 'someothervalue', 'valuewithchars@()#(G#@@@@))!@#$%^&*()_',
                '--arg3', 'value3', 'value4']);
                
    t.deepEqual(obj.arg1, ['value1.1', 'value1.2', 'value1.3'], 'obj.arg1 should be an array with 3 elements');
    t.equal(obj.arg2[3], 'valuewithchars@()#(G#@@@@))!@#$%^&*()_', 'obj.arg2[3] should === valuewithchars@()#(G#@@@@))!@#$%^&*()_');
});