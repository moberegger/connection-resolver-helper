import { UserInputError } from "apollo-server-errors";
import { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
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
    const { first, last } = args;

    const firstIsANumber = typeof first === "number";
    const lastIsANumber = typeof last === "number";

    if (firstIsANumber && first < 0)
      throw new UserInputError(
        'Argument "first" must be a non-negative integer.'
      );

    if (lastIsANumber && last < 0)
      throw new UserInputError(
        'Argument "last" must be a non-negative integer.'
      );

    if (firstIsANumber && lastIsANumber)
      throw new UserInputError(
        'Passing both "first" and "last" to paginate the connection is not supported.'
      );

    if (paginationRequired && !firstIsANumber && !lastIsANumber)
      throw new UserInputError(
        "You must provide a `first` or `last` value to properly paginate the connection."
      );

    if (firstIsANumber && first > maxLimit!)
      throw new UserInputError(
        `Requesting ${first} records on the connection exceeds the "first" limit of ${maxLimit} records.`
      );

    if (lastIsANumber && last > maxLimit!)
      throw new UserInputError(
        `Requesting ${last} records on the connection exceeds the "last" limit of ${maxLimit} records.`
      );

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
