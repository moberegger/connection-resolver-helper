import { ConnectionArguments } from "graphql-relay";

import GraphQLConnectionError from "./GraphQLConnectionError";
import type { ValidateCursorFunction } from ".";

export default ({
    maxLimit,
    paginationRequired,
    validateCursor,
  }: {
    maxLimit: number;
    paginationRequired: boolean;
    validateCursor: ValidateCursorFunction;
  }) =>
  ({ after, before, first, last }: ConnectionArguments) => {
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
  };
