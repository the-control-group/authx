import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLCredential } from "../GraphQLCredential";
import { Credential } from "../../model";

export const credential: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLCredential,
  description: "Fetch a credential by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Credential<any>> {
    const {
      executor,
      authorization: a,
      realm,
      strategies: { credentialMap }
    } = context;
    if (!a) return null;
    const credential = await Credential.read(executor, args.id, credentialMap);
    return (await credential.isAccessibleBy(realm, a, executor))
      ? credential
      : null;
  }
};
