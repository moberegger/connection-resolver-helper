import GraphQLConnectionError from "./GraphQLConnectionError";
import makeConnection from "./makeConnection";

export type { ConnectionArguments } from "graphql-relay";

export type {
  ConnectionOptions,
  GetTotalCountFunction,
  ToCursorFunction,
  ValidateCursorFunction,
} from "./makeConnection";

export { toConnection } from "./toConnection";

const connection = makeConnection();

export { connection, GraphQLConnectionError, makeConnection };
