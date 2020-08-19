import { registerHooks } from "../../util";
import { pagingTests } from "./generic";
import {
  createV2AuthXScope,
  CredentialAction,
  CredentialContext
} from "@authx/authx/dist/util/scopes";

const ctx = registerHooks(__filename);

function createReadScope(
  credentialId: string,
  authorityId: string,
  userId: string
): string {
  const action: CredentialAction = {
    basic: "r",
    details: ""
  };

  const context: CredentialContext = {
    type: "credential",
    userId: userId,
    authorityId: authorityId,
    credentialId: credentialId
  };

  const scope = createV2AuthXScope("authx", context, action);

  return scope;
}

pagingTests({
  testName: "by credential ID",
  entityType: "credential",
  ids: [
    "8d5d1c50-cba2-4afe-83fa-3b8d784b607c",
    "03e69b4c-3f73-4b15-866c-17efeeed1678",
    "2e933e24-072f-41dd-b5f2-75d27f11a8b4",
    "0bae2fed-26ac-4fa2-8879-a226c9fb859a"
  ].sort(),
  scopes: [
    createReadScope("8d5d1c50-cba2-4afe-83fa-3b8d784b607c", "*", "*"),
    createReadScope("03e69b4c-3f73-4b15-866c-17efeeed1678", "*", "*"),
    createReadScope("2e933e24-072f-41dd-b5f2-75d27f11a8b4", "*", "*"),
    createReadScope("0bae2fed-26ac-4fa2-8879-a226c9fb859a", "*", "*")
  ],
  ctx: ctx
});

pagingTests({
  testName: "by authority ID",
  entityType: "credential",
  ids: [
    "c1a8cc41-66d5-4aef-8b97-e5f97d2bc699",
    "f1937f99-4c17-4b10-a745-345288727c1a",
    "8d5d1c50-cba2-4afe-83fa-3b8d784b607c",
    "6b33db96-05e5-4ade-8ac7-2959b96ce7db",
    "03e69b4c-3f73-4b15-866c-17efeeed1678",
    "a941a36d-a3d3-4c8b-a03a-f549dac3871e",
    "2e933e24-072f-41dd-b5f2-75d27f11a8b4",
    "0bae2fed-26ac-4fa2-8879-a226c9fb859a",
    "e1381b64-b0df-4e81-9b31-38ae2f1325fc"
  ].sort(),
  scopes: [createReadScope("*", "725f9c3b-4a72-4021-9066-c89e534df5be", "*")],
  ctx: ctx
});

pagingTests({
  testName: "by user ID",
  entityType: "credential",
  ids: [
    "42b27b88-672c-4649-9afa-77e114e6ad98",
    "02e588b0-60a7-4af5-a0c7-b78ed43957b4",
    "8d5d1c50-cba2-4afe-83fa-3b8d784b607c",
    "03e69b4c-3f73-4b15-866c-17efeeed1678"
  ].sort(),
  scopes: [
    createReadScope("*", "*", "d0fc4c64-a3d6-4d97-9341-07de24439bb1"),
    createReadScope("*", "*", "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3")
  ],
  ctx: ctx
});
