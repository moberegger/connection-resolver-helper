import { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
import { ConnectionArguments, offsetToCursor } from "graphql-relay";

import GraphQLConnectionError from "./GraphQLConnectionError";
import { toConnection } from "./toConnection";

export interface MakeConnectionOptions<Node> {
  maxLimit?: number;
  paginationRequired?: boolean;
  toCursor?: ToCursorFunction<Node>;
  validateCursor?: ValidateCursorFunction;
}

export type ToCursorFunction<Node> = (
  node: Node,
  args: ConnectionArguments,
  index: number
) => string;

export type ValidateCursorFunction = (cursor: string) => boolean;

const defaultToCursor = <Node>(
  _: Node,
  __: ConnectionArguments,
  index: number
) => offsetToCursor(index);

const defaultValidateCursor = (cursor: string) =>
  typeof cursor === "string" && cursor.length > 0;

const makeConnection =
  <
    Root,
    Node,
    Context,
    Args extends ConnectionArguments = ConnectionArguments
  >({
    maxLimit = 100,
    paginationRequired = false,
    toCursor = defaultToCursor,
    validateCursor = defaultValidateCursor,
  }: MakeConnectionOptions<Node> = {}) =>
  (
    resolver: GraphQLFieldResolver<
      Root,
      Context,
      Args,
      Promise<Node[]> | Node[]
    >
  ) =>
  async (
    root: Root,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ) => {
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

    if (afterIsDefined && !validateCursor(after))
      throw new GraphQLConnectionError('Argument "after" is invalid.');

    if (beforeIsDefined && !validateCursor(before))
      throw new GraphQLConnectionError('Argument "before" is invalid.');

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

    return toConnection(
      root,
      (await resolver(root, args, context, info)) ?? [],
      args,
      toCursor
    );
  };

export default makeConnection;
export { GraphQLConnectionError, toConnection, offsetToCursor };
