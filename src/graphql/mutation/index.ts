import { createClient } from "./createClient";
import { updateClient } from "./updateClient";

import { createGrant } from "./createGrant";
import { updateGrant } from "./updateGrant";

import { createRole } from "./createRole";
import { updateRole } from "./updateRole";

import { createToken } from "./createToken";
import { updateToken } from "./updateToken";

import { createUser } from "./createUser";
import { updateUser } from "./updateUser";

export const mutationFields = {
  createClient,
  updateClient,

  createGrant,
  updateGrant,

  createRole,
  updateRole,

  createToken,
  updateToken,

  createUser,
  updateUser
};

export const mutationTypes = [];
