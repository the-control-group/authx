import { responsePathAsArray, GraphQLResolveInfo } from "graphql";

type HighResolutionTime = [number, number];

const traceHRStartTime = Symbol("HR Start Time");
const traceWallStartTime = Symbol("Wall Start Time");
export const apolloTracingContext = Symbol("Apollo Tracing Context");

export interface ApolloTracingContext {
  [traceHRStartTime]: HighResolutionTime;
  [traceWallStartTime]: Date;
  version: 1;
  startTime: string;
  endTime: string;
  duration: number;
  execution: {
    parsing?: {
      startOffset: number;
      duration: number;
    };
    validation?: {
      startOffset: number;
      duration: number;
    };
    resolvers: ApolloTracingResolverStats[];
  };
}

export interface ApolloTracingResolverStats {
  path: (string | number)[];
  parentType: string;
  fieldName: string;
  returnType: string;
  startOffset: number;
  duration: number;
}

function durationHrTimeToNanos(hrtime: HighResolutionTime): number {
  return hrtime[0] * 1e9 + hrtime[1];
}

export async function apolloTracingGraphQLMiddleware(
  resolve: Function,
  parent: any,
  args: any,
  context: { [apolloTracingContext]: ApolloTracingContext },
  info: GraphQLResolveInfo
): Promise<any> {
  const startOffset = durationHrTimeToNanos(
    process.hrtime(context[apolloTracingContext][traceHRStartTime])
  );
  try {
    return await resolve(parent, args, context, info);
  } finally {
    context[apolloTracingContext].execution.resolvers.push({
      path: [...responsePathAsArray(info.path)],
      parentType: info.parentType.toString(),
      fieldName: info.fieldName,
      returnType: info.returnType.toString(),
      startOffset,
      duration:
        durationHrTimeToNanos(
          process.hrtime(context[apolloTracingContext][traceHRStartTime])
        ) - startOffset
    });
  }
}

export function startTracingContext(): ApolloTracingContext {
  const wallStartTime = new Date();
  return {
    [traceHRStartTime]: process.hrtime(),
    [traceWallStartTime]: wallStartTime,
    version: 1,
    startTime: wallStartTime.toISOString(),
    endTime: "",
    duration: 0,
    execution: {
      resolvers: []
    }
  };
}

export function endTracingContext(context: ApolloTracingContext): void {
  context.endTime = new Date().toISOString();
  context.duration = durationHrTimeToNanos(
    process.hrtime(context[traceHRStartTime])
  );
}
