import { toConnection } from "./toConnection";
import validateArgs from "./validateArgs";
import validateConfig from "./validateConfig";

import type { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
import type { ConnectionArguments } from "graphql-relay";

export interface ConnectionOptions<Root, Node> {
  maxLimit?: number;
  paginationRequired?: boolean;
  disableBackwardsPagination?: boolean;
  toCursor?: ToCursorFunction<Node>;
  validateCursor?: ValidateCursorFunction;
  getTotalCount?: GetTotalCountFunction<Root, Node>;
}

export type ToCursorFunction<Node> = (
  node: Node,
  args: ConnectionArguments,
  index: number
) => string;

export type ValidateCursorFunction = (cursor: string) => boolean;

export type GetTotalCountFunction<Root, Node> = (
  root: Root,
  node: Node[],
  args: ConnectionArguments
) => number;

type Result<Node> = Promise<Node[]> | Node[];

type ConnectionResolverOptions<Root, Node> = Pick<
  ConnectionOptions<Root, Node>,
  "toCursor" | "validateCursor"
>;

const defaultToCursor = <Node>(
  _: Node,
  __: ConnectionArguments,
  index: number
) => index.toString();

const defaultValidateCursor = (cursor: string) =>
  typeof cursor === "string" && cursor.length > 0;

const defaultGetTotalCount = <Root, Node>(_: Root, data: Node[]) => data.length;

export default <
  Root,
  Node,
  Context,
  Args extends ConnectionArguments = ConnectionArguments
>({
  maxLimit = 100,
  paginationRequired = true,
  disableBackwardsPagination = false,
  toCursor: toCursorFromConfig = defaultToCursor,
  validateCursor: validateCursorFromConfig = defaultValidateCursor,
  getTotalCount = defaultGetTotalCount,
}: ConnectionOptions<Root, Node> = {}) => {
  validateConfig({
    maxLimit,
    paginationRequired,
    disableBackwardsPagination,
    toCursor: toCursorFromConfig,
    validateCursor: validateCursorFromConfig,
    getTotalCount,
  });

  return (
      resolver: GraphQLFieldResolver<Root, Context, Args, Result<Node>>,
      {
        toCursor = toCursorFromConfig,
        validateCursor = validateCursorFromConfig,
      }: ConnectionResolverOptions<Root, Node> = {}
    ) =>
    async (
      root: Root,
      args: Args,
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      validateArgs({
        maxLimit,
        paginationRequired,
        disableBackwardsPagination,
        validateCursor,
      })(args);

      return toConnection(
        root,
        (await resolver(root, args, context, info)) ?? [],
        args,
        toCursor,
        getTotalCount
      );
    };
};
