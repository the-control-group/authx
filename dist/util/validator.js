'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _authority = require('../../schema/authority');

var _authority2 = _interopRequireDefault(_authority);

var _client = require('../../schema/client');

var _client2 = _interopRequireDefault(_client);

var _credential = require('../../schema/credential');

var _credential2 = _interopRequireDefault(_credential);

var _grant = require('../../schema/grant');

var _grant2 = _interopRequireDefault(_grant);

var _profile = require('../../schema/profile');

var _profile2 = _interopRequireDefault(_profile);

var _role = require('../../schema/role');

var _role2 = _interopRequireDefault(_role);

var _team = require('../../schema/team');

var _team2 = _interopRequireDefault(_team);

var _user = require('../../schema/user');

var _user2 = _interopRequireDefault(_user);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema('authority', _authority2.default);
env.addSchema('client', _client2.default);
env.addSchema('credential', _credential2.default);
env.addSchema('grant', _grant2.default);
env.addSchema('profile', _profile2.default);
env.addSchema('role', _role2.default);
env.addSchema('team', _team2.default);
env.addSchema('user', _user2.default);

exports.default = env.validate.bind(env);