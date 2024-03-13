export interface AuthorityContext {
  type: "authority";
  authorityId: string;
  authorizationId?: undefined;
  clientId?: undefined;
  credentialId?: undefined;
  grantId?: undefined;
  roleId?: undefined;
  userId?: undefined;
}

export interface AuthorityAction {
  basic: "r" | "w" | "*";
  details: "" | "r" | "w" | "*";
  scopes?: undefined;
  secrets?: undefined;
  users?: undefined;
}

export interface AuthorizationContext {
  type: "authorization";
  authorityId?: undefined;
  authorizationId: string;
  clientId: string;
  credentialId?: undefined;
  grantId: string;
  roleId?: undefined;
  userId: string;
}

export interface AuthorizationAction {
  basic: "r" | "w" | "*";
  details?: undefined;
  scopes: "" | "r" | "w" | "*";
  secrets: "" | "r" | "w" | "*";
  users?: undefined;
}

export interface ClientContext {
  type: "client";
  authorityId?: undefined;
  authorizationId?: undefined;
  clientId: string;
  credentialId?: undefined;
  grantId?: undefined;
  roleId?: undefined;
  userId?: undefined;
}

export interface ClientAction {
  basic: "r" | "w" | "*";
  details?: undefined;
  scopes?: undefined;
  secrets: "" | "r" | "w" | "*";
  users?: undefined;
}

export interface CredentialContext {
  type: "credential";
  authorityId: string;
  authorizationId?: undefined;
  clientId?: undefined;
  credentialId: string;
  grantId?: undefined;
  roleId?: undefined;
  userId: string;
}

export interface CredentialAction {
  basic: "r" | "w" | "*";
  details: "" | "r" | "w" | "*";
  scopes?: undefined;
  secrets?: undefined;
  users?: undefined;
}

export interface GrantContext {
  type: "grant";
  authorityId?: undefined;
  authorizationId?: undefined;
  clientId: string;
  credentialId?: undefined;
  grantId: string;
  roleId?: undefined;
  userId: string;
}

export interface GrantAction {
  basic: "r" | "w" | "*";
  details?: undefined;
  scopes: "" | "r" | "w" | "*";
  secrets: "" | "r" | "w" | "*";
  users?: undefined;
}

export interface RoleContext {
  type: "role";
  authorityId?: undefined;
  authorizationId?: undefined;
  clientId?: undefined;
  credentialId?: undefined;
  grantId?: undefined;
  roleId: string;
  userId?: undefined;
}

export interface RoleAction {
  basic: "r" | "w" | "*";
  details?: undefined;
  scopes: "" | "r" | "w" | "*";
  secrets?: undefined;
  users: "" | "r" | "w" | "*";
}

export interface UserContext {
  type: "user";
  authorityId?: undefined;
  authorizationId?: undefined;
  clientId?: undefined;
  credentialId?: undefined;
  grantId?: undefined;
  roleId?: undefined;
  userId: string;
}

export interface UserAction {
  basic: "r" | "w" | "*";
  details?: undefined;
  scopes: "" | "r" | "*";
  secrets?: undefined;
  users?: undefined;
}

export function createV2AuthXScope(
  realm: string,
  context: AuthorityContext,
  action: AuthorityAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: AuthorizationContext,
  action: AuthorizationAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: ClientContext,
  action: ClientAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: CredentialContext,
  action: CredentialAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: GrantContext,
  action: GrantAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: RoleContext,
  action: RoleAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: UserContext,
  action: UserAction,
): string;

export function createV2AuthXScope(
  realm: string,
  context: Context,
  action: Action,
): string {
  return `${realm}:${createV2AuthXScopeContext(
    context,
  )}:${createV2AuthXScopeAction(action)}`;
}

export type Context =
  | AuthorityContext
  | AuthorizationContext
  | ClientContext
  | CredentialContext
  | GrantContext
  | RoleContext
  | UserContext;

export function createV2AuthXScopeContext(context: Context): string {
  return `v2.${context.type}.${context.authorityId ?? ""}.${
    context.authorizationId ?? ""
  }.${context.clientId ?? ""}.${context.credentialId ?? ""}.${
    context.grantId ?? ""
  }.${context.roleId ?? ""}.${context.userId ?? ""}`;
}

export type Action =
  | AuthorityAction
  | AuthorizationAction
  | ClientAction
  | CredentialAction
  | GrantAction
  | RoleAction
  | UserAction;

export function createV2AuthXScopeAction(action: Action): string {
  return `${action.basic}.${action.details ?? ""}.${action.scopes ?? ""}.${
    action.secrets ?? ""
  }.${action.users ?? ""}`;
}
