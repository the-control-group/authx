'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.validate = validate;
exports.normalize = normalize;
exports.combine = combine;
exports.simplifyCollection = simplifyCollection;
exports.combineCollections = combineCollections;
exports.can = can;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function makeRegExp(scope) {
	var pattern = scope.split(':').map(function (domain) {
		return domain.split('.').map(function (part) {
			if (part === '**') return '([^:]*)';
			if (part === '*') return '(\\*|[^\\.^:^*]*)';
			return part.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
		}).join('\\.');
	}).join(':');

	return new RegExp('^' + pattern + '$');
}

function validate(scope) {
	return (/^(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)$/.test(scope)
	);
}

function normalize(scope) {
	return scope.split(':').map(function (domain) {
		return domain.split('.').map(function (part, i, parts) {
			if (part !== '**' || parts[i + 1] !== '**' && parts[i + 1] !== '*') return part;
			parts[i + 1] = '**';
			return '*';
		}).join('.');
	}).join(':');
}

// combines scopes `a` and `b`, returning the most permissive common scope or `null`
function combine(a, b) {
	a = normalize(a);
	b = normalize(b);

	// literal equal
	if (a == b) return a;

	var aX = makeRegExp(a);
	var bX = makeRegExp(b);

	var a_b = aX.test(b);
	var b_a = bX.test(a);

	// a supercedes b
	if (b_a && !a_b) return a;

	// b supercedes a
	if (a_b && !b_a) return b;

	// ...the scopes are thus mutually exclusive (because they cannot be mutually inclusive without being equal)

	// if there are no wildcard sequences, then there is no possibility of a combination
	if (!a.includes('*') || !b.includes('*')) return null;

	// ...substitute the wildcard matches from A into the the wildcards of B

	// loop through each domain
	var substitution = [];
	var wildcardMap = [];
	var pattern = '^' + a.split(':').map(function (domain, d) {
		return domain.split('.').map(function (part, p) {
			substitution[d] = substitution[d] || [];
			substitution[d][p] = part;

			if (part === '**') {
				wildcardMap.push({ w: '**', d: d, p: p });
				return '([^:]*)';
			}

			if (part === '*') {
				wildcardMap.push({ w: '*', d: d, p: p });
				return '([^\\.^:]*)';
			}

			return '[^:^.]*';
		}).join('\\.');
	}).join(':') + '$';

	var matches = b.match(pattern);

	// substitution failed, the scopes are incompatible
	if (!matches) return null;

	// make the substitutions, downgrade captured double wildcards
	wildcardMap.forEach(function (map, i) {
		substitution[map.d][map.p] = map.w === '*' && matches[i + 1] === '**' ? '*' : matches[i + 1];
	});

	// the combined result
	var combined = substitution.map(function (d) {
		return d.join('.');
	}).join(':');

	// test the substitution
	if (bX.test(combined)) return combined;

	return null;
}

function simplify(winners, candidate) {
	if (can(winners, candidate)) return winners;
	return winners.concat(candidate);
}

// returns a de-duplified array of scope rules
function simplifyCollection(collection) {
	return collection.reduce(simplify, []).reduceRight(simplify, []);
}

// calculates the product of scope rules or returns null
function combineCollections(collectionA, collectionB) {
	var _ref;

	return simplifyCollection((_ref = []).concat.apply(_ref, _toConsumableArray(collectionA.map(function (a) {
		return [].concat(collectionB.map(function (b) {
			return combine(a, b);
		}).filter(function (x) {
			return x;
		}));
	}))));
}

// according to the supplied rule, can the given subject be performed?
function can(rule, subject, strict) {
	strict = strict !== false;

	if (Array.isArray(rule)) return rule.some(function (r) {
		return can(r, subject, strict);
	});

	return strict ? makeRegExp(rule).test(subject) : !!combine(rule, subject);
}