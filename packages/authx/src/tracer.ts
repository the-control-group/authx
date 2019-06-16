import { responsePathAsArray, GraphQLResolveInfo } from "graphql";
import { Context } from "./Context";

type HighResolutionTime = [number, number];

export const traceHRStartTime = Symbol("start");

export interface TracingContext {
  [traceHRStartTime]: HighResolutionTime;
  startTime: Date;
  execution: {
    resolvers: ResolverSpan[];
  };
}

export interface ResolverSpan {
  path: (string | number)[];
  parentType: string;
  fieldName: string;
  returnType: string;
  startOffset: number;
  duration: number;
}

export async function tracerGraphQLMiddleware(
  resolve: Function,
  parent: any,
  args: any,
  context: Context,
  info: GraphQLResolveInfo
): Promise<any> {
  const startOffset = durationHrTimeToNanos(
    process.hrtime(context.tracing[traceHRStartTime])
  );
  try {
    const result = await resolve(parent, args, context, info);
    return result;
  } finally {
    context.tracing.execution.resolvers.push({
      path: [...responsePathAsArray(info.path)],
      parentType: info.parentType.toString(),
      fieldName: info.fieldName,
      returnType: info.returnType.toString(),
      startOffset,
      duration:
        durationHrTimeToNanos(
          process.hrtime(context.tracing[traceHRStartTime])
        ) - startOffset
    });
  }
}

export function durationHrTimeToNanos(hrtime: HighResolutionTime): number {
  return hrtime[0] * 1e9 + hrtime[1];
}
