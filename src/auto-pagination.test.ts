/// <reference types="jest-extended" />

import { ApolloServer } from "apollo-server";
import gql from "graphql-tag";

import { edges, fixtures, typeDefs } from "./fixtures";
import makeConnection, { offsetToCursor } from ".";

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
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int!) {
            things(first: $first) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 2 },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(0, 2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: offsetToCursor(0),
        endCursor: offsetToCursor(1),
      });
    });

    it("only returns first n items after provided cursor", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int!, $after: String!) {
            things(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 2, after: offsetToCursor(0) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(1, 3));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: offsetToCursor(1),
        endCursor: offsetToCursor(2),
      });
    });

    it("knows when it is at the last page", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int!, $after: String!) {
            things(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 2, after: offsetToCursor(1) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: offsetToCursor(2),
        endCursor: offsetToCursor(3),
      });
    });

    it("properly handles attempting to page past last item", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int!, $after: String!) {
            things(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 10, after: offsetToCursor(1) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: offsetToCursor(2),
        endCursor: offsetToCursor(3),
      });
    });

    // XXX graphql-relay defaults to the beginning of the list if the after cursor is more than the size of the list
    it.todo("properly handles cursors past last page item");
  });

  describe("backwards pagination", () => {
    it("only returns last n items when first argument is provided", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($last: Int!) {
            things(last: $last) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { last: 2 },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: offsetToCursor(2),
        endCursor: offsetToCursor(3),
      });
    });

    it("only returns last n items before provided cursor", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($last: Int!, $before: String!) {
            things(last: $last, before: $before) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { last: 2, before: offsetToCursor(3) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(1, 3));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: offsetToCursor(1),
        endCursor: offsetToCursor(2),
      });
    });

    it("knows when it is at the first page", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($last: Int!, $before: String!) {
            things(last: $last, before: $before) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { last: 2, before: offsetToCursor(2) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(0, 2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: offsetToCursor(0),
        endCursor: offsetToCursor(1),
      });
    });

    it("properly handles attempting to page past first item", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($last: Int!, $before: String!) {
            things(last: $last, before: $before) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }

              edges {
                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { last: 10, before: offsetToCursor(2) },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges).toEqual(edges.slice(0, 2));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: offsetToCursor(0),
        endCursor: offsetToCursor(1),
      });
    });

    // XXX graphql-relay defaults to the end of the list if the before cursor is less than 0
    it.todo("properly handles cursors before first page item");
  });
});
