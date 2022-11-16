import {
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
} from "graphql";
import {
  Connection,
  ConnectionArguments,
  Edge,
  connectionFromArray,
} from "graphql-relay";

interface MakeConnectionOptions {
  maxLimit?: number;
  paginationRequired?: boolean;
}

interface ExtendedEdge<Root, Node> extends Edge<Node> {
  root: Root;
}

interface ExtendedConnection<Root, Node> extends Connection<Node> {
  edges: Array<ExtendedEdge<Root, Node>>;
  nodes: Array<Node>;
  totalCount: number;
}

export class GraphQLConnectionError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: "RELAY_PAGINATION_ERROR" } });

    Object.defineProperty(this, "name", { value: "GraphQLConnectionError" });
  }
}

const makeConnection =
  (
    { maxLimit, paginationRequired }: MakeConnectionOptions = {
      maxLimit: 100,
      paginationRequired: false,
    }
  ) =>
  (resolver: GraphQLFieldResolver<any, any>) =>
  async (
    root: any,
    args: ConnectionArguments,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<ExtendedConnection<any, any>> => {
    const { after, before, first, last } = args;

    const afterIsDefined = after !== undefined && after !== null;
    const beforeIsDefined = before !== undefined && before !== null;
    const firstIsDefined = first !== undefined && first !== null;
    const lastIsDefined = last !== undefined && last !== null;

    if (firstIsDefined && (typeof first !== "number" || first < 0))
      throw new GraphQLConnectionError(
        'Argument "first" must be a non-negative integer.'
      );

    if (lastIsDefined && (typeof last !== "number" || last < 0))
      throw new GraphQLConnectionError(
        'Argument "last" must be a non-negative integer.'
      );

    if (firstIsDefined && lastIsDefined)
      throw new GraphQLConnectionError(
        'Passing both "first" and "last" to paginate the connection is not supported.'
      );

    if (afterIsDefined && (typeof after !== "string" || after.length === 0))
      throw new GraphQLConnectionError(
        'Argument "after" must be a non-empty string'
      );

    if (beforeIsDefined && (typeof before !== "string" || before.length === 0))
      throw new GraphQLConnectionError(
        'Argument "before" must be a non-empty string'
      );

    if (paginationRequired && !firstIsDefined && !lastIsDefined)
      throw new GraphQLConnectionError(
        "You must provide a `first` or `last` value to properly paginate the connection."
      );

    if (firstIsDefined && first > maxLimit!)
      throw new GraphQLConnectionError(
        `Requesting ${first} records on the connection exceeds the "first" limit of ${maxLimit} records.`
      );

    if (lastIsDefined && last > maxLimit!)
      throw new GraphQLConnectionError(
        `Requesting ${last} records on the connection exceeds the "last" limit of ${maxLimit} records.`
      );

    const response: any = await resolver(root, args, context, info);

    const connection = connectionFromArray(response, args);

    return {
      ...connection,
      get nodes() {
        return connection.edges.map((edge) => edge.node);
      },
      get edges() {
        return connection.edges.map((edge) => ({ root, ...edge }));
      },
      totalCount: connection.edges.length,
    };
  };

export default makeConnection;
