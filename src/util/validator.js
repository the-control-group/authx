const jjv = require('jjv');

const authority = require('../../schema/authority');
const client = require('../../schema/client');
const credential = require('../../schema/credential');
const grant = require('../../schema/grant');
const profile = require('../../schema/profile');
const role = require('../../schema/role');
const team = require('../../schema/team');
const user = require('../../schema/user');

var env = jjv();

env.addSchema('authority', authority);
env.addSchema('client', client);
env.addSchema('credential', credential);
env.addSchema('grant', grant);
env.addSchema('profile', profile);
env.addSchema('role', role);
env.addSchema('team', team);
env.addSchema('user', user);

module.exports = env.validate.bind(env);
