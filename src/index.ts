import { UserInputError } from "apollo-server-errors";
import { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
import {
  Connection,
  ConnectionArguments,
  Edge,
  connectionFromArray,
} from "graphql-relay";

interface MakeConnectionOptions {
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

const makeConnection =
  (options: MakeConnectionOptions = { paginationRequired: false }) =>
  (resolver: GraphQLFieldResolver<any, any>) =>
  async (
    root: any,
    args: ConnectionArguments,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<ExtendedConnection<any, any>> => {
    const { paginationRequired } = options;
    const { before, after, first, last } = args;

    if (typeof first === "number" && first < 0)
      throw new UserInputError(
        'Argument "first" must be a non-negative integer'
      );

    if (typeof last === "number" && last < 0)
      throw new UserInputError(
        'Argument "last" must be a non-negative integer'
      );

    if (paginationRequired) {
      const hasBeforeParams = before && last;
      const hasAfterParams = after && first;

      if (!hasBeforeParams && !hasAfterParams) throw new Error();
    }

    const response: any = await resolver(root, args, context, info);

    const connection = connectionFromArray(response, args);

    return {
      ...connection,
      nodes: connection.edges.map((edge) => edge.node),
      edges: connection.edges.map((edge) => ({ root, ...edge })),
      totalCount: connection.edges.length,
    };
  };

export default makeConnection;
