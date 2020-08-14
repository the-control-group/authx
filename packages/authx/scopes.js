module.exports = {
	...require("./dist/util/scopes"),
	...require("./dist/util/createV2AuthorityAdministrationScopes"),
	...require("./dist/util/createV2CredentialAdministrationScopes"),
};
