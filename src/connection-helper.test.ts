import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";
import gql from "graphql-tag";

import makeConnection from ".";

const fixtures = [
  { id: 1, value: "A" },
  { id: 2, value: "B" },
  { id: 3, value: "C" },
];

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
  });

  describe("configuration", () => {
    describe("paginationRequired", () => {
      const resolvers = {
        Query: {
          things: makeConnection({ paginationRequired: true })(() => fixtures),
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
  });

  it("can run the connection", async () => {
    const resolvers = {
      Query: {
        things: makeConnection()(() => fixtures),
      },
    };

    const server = new ApolloServer({ typeDefs, resolvers });

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
        edges: [
          { node: { id: "1", value: "A" } },
          { node: { id: "2", value: "B" } },
          { node: { id: "3", value: "C" } },
        ],
      },
    });
  });
});
