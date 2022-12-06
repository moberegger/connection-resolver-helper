// eslint-disable-next-line import/no-extraneous-dependencies
import gql from "graphql-tag";

export const fixtures = [
  { id: "1", value: "ABC" },
  { id: "2", value: "BCD" },
  { id: "3", value: "CDE" },
  { id: "4", value: "DEF" },
  { id: "5", value: "EFG" },
  { id: "6", value: "FGH" },
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
