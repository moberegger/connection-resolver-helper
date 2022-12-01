import { GraphQLError } from "graphql";

export default class GraphQLConnectionError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: "RELAY_PAGINATION_ERROR" } });
    this.name = "GraphQLConnectionError";
  }
}
