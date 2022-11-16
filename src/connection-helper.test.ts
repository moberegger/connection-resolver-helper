import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";
import { offsetToCursor } from "graphql-relay";
import gql from "graphql-tag";
import "jest-extended";

import makeConnection from ".";

const fixtures = [
  { id: "1", value: "A" },
  { id: "2", value: "B" },
  { id: "3", value: "C" },
];

const edges = fixtures.map((node) => ({ node }));

const typeDefs = gql`
  interface Node {
    id: ID!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type Thing implements Node {
    id: ID!
    value: String!
  }

  type ThingConnection {
    edges: [ThingEdge]
    pageInfo: PageInfo!
  }

  type ThingEdge {
    cursor: String!
    node: Thing
  }

  type Query {
    things(
      after: String
      before: String
      first: Int
      last: Int
    ): ThingConnection
  }
`;

describe("Connection Helper", () => {
  describe("pagination", () => {
    const server = new ApolloServer({
      typeDefs,
      resolvers: {
        Query: {
          things: makeConnection()(() => fixtures),
        },
      },
    });

    it("returns all items when no pagination arguments are provided", async () => {
      const result = await server.executeOperation({
        query: gql`
          query {
            things {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
      });

      expect(result.errors).toBeNil();
      expect(result.data).toEqual({
        things: {
          edges,
        },
      });
    });

    describe("forwards pagination", () => {
      it("only returns first n items when first argument is provided", async () => {
        const first = 1;
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!) {
              things(first: $first) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { first },
        });

        expect(result.errors).toBeNil();
        expect(result.data).toEqual({
          things: {
            edges: [edges[0]],
          },
        });
      });

      it("only returns first n items after provided cursor", async () => {
        const first = 1;
        const after = offsetToCursor(0);
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!, $after: String!) {
              things(first: $first, after: $after) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { first, after },
        });

        expect(result.errors).toBeNil();
        expect(result.data).toEqual({
          things: {
            edges: [edges[1]],
          },
        });
      });
    });

    describe("backwards pagination", () => {
      it("only returns last n items when first argument is provided", async () => {
        const last = 1;
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!) {
              things(last: $last) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { last },
        });

        expect(result.errors).toBeNil();
        expect(result.data).toEqual({
          things: {
            edges: [edges[2]],
          },
        });
      });

      it("only returns last n items before provided cursor", async () => {
        const last = 1;
        const before = offsetToCursor(2);
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!, $before: String!) {
              things(last: $last, before: $before) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { last, before },
        });

        expect(result.errors).toBeNil();
        expect(result.data).toEqual({
          things: {
            edges: [edges[1]],
          },
        });
      });
    });
  });

  describe("input validation", () => {
    const resolvers = {
      Query: {
        things: makeConnection()(() => fixtures),
      },
    };

    const server = new ApolloServer({ typeDefs, resolvers });

    it('returns error if "first" param is a negative integer', async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int) {
            things(first: $first) {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: -1 },
      });

      const error = result.errors?.[0];
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe(
        'Argument "first" must be a non-negative integer.'
      );
    });

    it('returns error if "last" param is a negative integer', async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($last: Int) {
            things(last: $last) {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { last: -1 },
      });

      const error = result.errors?.[0];
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe(
        'Argument "last" must be a non-negative integer.'
      );
    });

    it('returns error if both "first" and "last" params are provided', async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int, $last: Int) {
            things(first: $first, last: $last) {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 10, last: 10 },
      });

      const error = result.errors?.[0];
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe(
        'Passing both "first" and "last" to paginate the connection is not supported.'
      );
    });

    it("returns error if after cursor is invalid", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int, $after: String) {
            things(first: $first, after: $after) {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 10, after: "" },
      });

      const error = result.errors?.[0];
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe(
        'Argument "after" must be a non-empty string'
      );
    });

    it("returns error if before cursor is invalid", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int, $before: String) {
            things(first: $first, before: $before) {
              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 10, before: "" },
      });

      const error = result.errors?.[0];
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe(
        'Argument "before" must be a non-empty string'
      );
    });
  });

  describe("configuration", () => {
    describe("paginationRequired", () => {
      describe("when pagination is required", () => {
        const resolvers = {
          Query: {
            things: makeConnection({ paginationRequired: true })(
              () => fixtures
            ),
          },
        };

        const server = new ApolloServer({ typeDefs, resolvers });

        it('returns error if neither "first" or "last" params are provided', async () => {
          const result = await server.executeOperation({
            query: gql`
              query {
                things {
                  edges {
                    node {
                      id
                      value
                    }
                  }
                }
              }
            `,
          });

          const error = result.errors?.[0];
          expect(error).toBeInstanceOf(GraphQLError);
          expect(error?.message).toBe(
            "You must provide a `first` or `last` value to properly paginate the connection."
          );
        });
      });

      describe("when pagination is not required", () => {
        const resolvers = {
          Query: {
            things: makeConnection({ paginationRequired: false })(
              () => fixtures
            ),
          },
        };

        const server = new ApolloServer({ typeDefs, resolvers });

        it('does not return error if neither "first" or "last" params are provided', async () => {
          const result = await server.executeOperation({
            query: gql`
              query {
                things {
                  edges {
                    node {
                      id
                      value
                    }
                  }
                }
              }
            `,
          });

          expect(result.errors).toBeNil();
        });
      });
    });

    describe("maxLimit", () => {
      const maxLimit = 2;
      const resolvers = {
        Query: {
          things: makeConnection({ maxLimit })(() => fixtures),
        },
      };

      const server = new ApolloServer({ typeDefs, resolvers });

      it('returns error if "first" param is too high', async () => {
        const first = 10;
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int) {
              things(first: $first) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { first },
        });

        const error = result.errors?.[0];
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error?.message).toBe(
          `Requesting ${first} records on the connection exceeds the "first" limit of ${maxLimit} records.`
        );
      });

      it('returns error if "last" param is too high', async () => {
        const last = 10;
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int) {
              things(last: $last) {
                edges {
                  node {
                    id
                    value
                  }
                }
              }
            }
          `,
          variables: { last },
        });

        const error = result.errors?.[0];
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error?.message).toBe(
          `Requesting ${last} records on the connection exceeds the "last" limit of ${maxLimit} records.`
        );
      });
    });
  });
});
