import jjv from 'jjv';

import authority from '../../schema/authority';
import client from '../../schema/client';
import credential from '../../schema/credential';
import grant from '../../schema/grant';
import profile from '../../schema/profile';
import role from '../../schema/role';
import team from '../../schema/team';
import user from '../../schema/user';

var env = jjv();

env.addSchema('authority', authority);
env.addSchema('client', client);
env.addSchema('credential', credential);
env.addSchema('grant', grant);
env.addSchema('profile', profile);
env.addSchema('role', role);
env.addSchema('team', team);
env.addSchema('user', user);

export default env.validate.bind(env);
