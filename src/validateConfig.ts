import type { ConnectionOptions } from ".";

export default <Root, Node>({
  maxLimit,
  paginationRequired,
  disableBackwardsPagination,
  toCursor,
  validateCursor,
  getTotalCount,
}: ConnectionOptions<Root, Node>) => {
  if (typeof maxLimit !== "number" || maxLimit < 0)
    throw new Error(
      `Configuration option "maxLimit" must be a positive integer.`
    );

  if (typeof paginationRequired !== "boolean")
    throw new Error(
      `Configuration option "paginationRequired" must be a boolean.`
    );

  if (typeof disableBackwardsPagination !== "boolean")
    throw new Error(
      `Configuration option "disableBackwardsPagination" must be a boolean.`
    );

  if (typeof toCursor !== "function")
    throw new Error(`Configuration option "toCursor" must be a function.`);

  if (typeof validateCursor !== "function")
    throw new Error(
      `Configuration option "validateCursor" must be a function.`
    );

  if (typeof getTotalCount !== "function")
    throw new Error(`Configuration option "getTotalCount" must be a function.`);
};
