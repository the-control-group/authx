import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { authority } from "./authority";
import { authorities } from "./authorities";

import { client } from "./client";
import { clients } from "./clients";

import { credential } from "./credential";
import { credentials } from "./credentials";

import { grant } from "./grant";
import { grants } from "./grants";

import { role } from "./role";
import { roles } from "./roles";

import { token } from "./token";
import { tokens } from "./tokens";

import { user } from "./user";
import { users } from "./users";

export const queryFields = {
  authority,
  authorities,
  client,
  clients,
  credential,
  credentials,
  grant,
  grants,
  role,
  roles,
  token,
  tokens,
  user,
  users
};

export const queryTypes = [];
