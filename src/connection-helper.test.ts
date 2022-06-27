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

const resolvers = {
  Query: {
    things: makeConnection()(() => fixtures),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

describe("Connection Helper", () => {
  describe("input validation", () => {
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
        'Argument "first" must be a non-negative integer'
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
        'Argument "last" must be a non-negative integer'
      );
    });
  });

  it("can run the connection", async () => {
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
