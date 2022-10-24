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
    const { after, before, first, last } = args;

    const afterIsDefined = after !== undefined && after !== null;
    const beforeIsDefined = before !== undefined && before !== null;
    const firstIsDefined = first !== undefined && first !== null;
    const lastIsDefined = last !== undefined && last !== null;

    if (firstIsDefined && (typeof first !== "number" || first < 0))
      throw new UserInputError(
        'Argument "first" must be a non-negative integer.'
      );

    if (lastIsDefined && (typeof last !== "number" || last < 0))
      throw new UserInputError(
        'Argument "last" must be a non-negative integer.'
      );

    if (firstIsDefined && lastIsDefined)
      throw new UserInputError(
        'Passing both "first" and "last" to paginate the connection is not supported.'
      );

    if (afterIsDefined && (typeof after !== "string" || after.length === 0))
      throw new UserInputError('Argument "after" must be a non-empty string');

    if (beforeIsDefined && (typeof before !== "string" || before.length === 0))
      throw new UserInputError('Argument "before" must be a non-empty string');

    if (paginationRequired && !firstIsDefined && !lastIsDefined)
      throw new UserInputError(
        "You must provide a `first` or `last` value to properly paginate the connection."
      );

    if (firstIsDefined && first > maxLimit!)
      throw new UserInputError(
        `Requesting ${first} records on the connection exceeds the "first" limit of ${maxLimit} records.`
      );

    if (lastIsDefined && last > maxLimit!)
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
