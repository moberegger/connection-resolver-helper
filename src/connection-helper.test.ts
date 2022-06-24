import { ApolloServer } from "apollo-server";
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
