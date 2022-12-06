import { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
import { ConnectionArguments, offsetToCursor } from "graphql-relay";

import GraphQLConnectionError from "./GraphQLConnectionError";
import { toConnection } from "./toConnection";
import validateArgs from "./validateArgs";

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
    validateArgs({ maxLimit, paginationRequired, validateCursor })(args);

    return toConnection(
      root,
      (await resolver(root, args, context, info)) ?? [],
      args,
      toCursor
    );
  };

export default makeConnection;
export { GraphQLConnectionError, toConnection, offsetToCursor };
