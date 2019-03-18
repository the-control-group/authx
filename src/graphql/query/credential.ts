import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLCredential } from "../GraphQLCredential";
import { Credential } from "../../models";

export const credential: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLCredential,
  description: "Fetch a credential by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Credential<any>> {
    const { tx, token: t, realm, credentialMap } = context;
    if (!t) return null;

    const credential = await Credential.read(tx, args.id, credentialMap);
    return (await credential.isAccessibleBy(realm, t, tx)) ? credential : null;
  }
};
