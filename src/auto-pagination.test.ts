/// <reference types="jest-extended" />

import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";
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
    it("returns first n items when first argument is provided", async () => {
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

    describe("with after parameter", () => {
      it("returns first n items after provided cursor", async () => {
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
          variables: { first: 2, after: offsetToCursor(3) },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(4));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: offsetToCursor(4),
          endCursor: offsetToCursor(5),
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
          endCursor: offsetToCursor(5),
        });
      });

      it("errors when after cursor is not found", async () => {
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
          variables: { first: 2, after: "DoesNotExist" },
        });

        const error = result.errors?.[0];
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error?.message).toBe(
          `No record found for the provided "after" cursor: "DoesNotExist".`
        );
      });
    });

    describe("with before parameter", () => {
      it("returns first n items before provided cursor", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!, $before: String!) {
              things(first: $first, before: $before) {
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
          variables: { first: 2, before: offsetToCursor(5) },
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

      it("properly handles attempting to page past last item", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!, $before: String!) {
              things(first: $first, before: $before) {
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
          variables: { first: 10, before: offsetToCursor(2) },
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
    });

    describe("with both after and before parameters", () => {
      it("returns first n items between provided cursors", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!, $after: String!, $before: String!) {
              things(first: $first, after: $after, before: $before) {
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
          variables: {
            first: 2,
            after: offsetToCursor(0),
            before: offsetToCursor(5),
          },
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

      it("properly handles attempting to page past last item", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($first: Int!, $after: String!, $before: String!) {
              things(first: $first, after: $after, before: $before) {
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
          variables: {
            first: 10,
            after: offsetToCursor(1),
            before: offsetToCursor(5),
          },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(2, 5));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: offsetToCursor(2),
          endCursor: offsetToCursor(4),
        });
      });
    });
  });

  describe("backwards pagination", () => {
    it("only returns last n items when last argument is provided", async () => {
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
      expect(result.data?.things.edges).toEqual(edges.slice(4));
      expect(result.data?.things.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: offsetToCursor(4),
        endCursor: offsetToCursor(5),
      });
    });

    describe("with before parameter", () => {
      it("returns last n items before provided cursor", async () => {
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

      it("errors when after cursor is not found", async () => {
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
          variables: { last: 2, before: "DoesNotExist" },
        });

        const error = result.errors?.[0];
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error?.message).toBe(
          `No record found for the provided "before" cursor: "DoesNotExist".`
        );
      });
    });

    describe("with after parameter", () => {
      it("returns last n items after provided cursor", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!, $after: String!) {
              things(last: $last, after: $after) {
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
          variables: { last: 2, after: offsetToCursor(1) },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(4, 6));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: offsetToCursor(4),
          endCursor: offsetToCursor(5),
        });
      });

      it("properly handles attempting to page past first item", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!, $after: String!) {
              things(last: $last, after: $after) {
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
          variables: { last: 10, after: offsetToCursor(4) },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(4, 6));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: offsetToCursor(4),
          endCursor: offsetToCursor(5),
        });
      });
    });

    describe("with both after and before parameters", () => {
      it("returns last n items between provided cursors", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!, $after: String!, $before: String!) {
              things(last: $last, after: $after, before: $before) {
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
          variables: {
            last: 2,
            after: offsetToCursor(0),
            before: offsetToCursor(5),
          },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(3, 5));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: offsetToCursor(3),
          endCursor: offsetToCursor(4),
        });
      });

      it("properly handles attempting to page past first item", async () => {
        const result = await server.executeOperation({
          query: gql`
            query ($last: Int!, $after: String!, $before: String!) {
              things(last: $last, after: $after, before: $before) {
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
          variables: {
            last: 10,
            after: offsetToCursor(1),
            before: offsetToCursor(5),
          },
        });

        expect(result.errors).toBeNil();
        expect(result.data?.things.edges).toEqual(edges.slice(1, 5));
        expect(result.data?.things.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: offsetToCursor(1),
          endCursor: offsetToCursor(4),
        });
      });
    });
  });
});
