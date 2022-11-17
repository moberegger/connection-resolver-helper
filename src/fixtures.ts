// eslint-disable-next-line import/no-extraneous-dependencies
import gql from "graphql-tag";

export const fixtures = [
  { id: "1", value: "A" },
  { id: "2", value: "B" },
  { id: "3", value: "C" },
];

export const edges = fixtures.map((node) => ({ node }));

export const typeDefs = gql`
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
