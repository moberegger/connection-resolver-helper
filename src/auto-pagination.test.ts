/// <reference types="jest-extended" />

import { ApolloServer } from "apollo-server";

import gql from "graphql-tag";

import { edges, fixtures, typeDefs } from "./fixtures";
import makeConnection, { offsetToCursor } from ".";

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
});
