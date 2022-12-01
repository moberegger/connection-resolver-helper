/// <reference types="jest-extended" />

import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";

import gql from "graphql-tag";

import { fixtures, typeDefs } from "./fixtures";
import makeConnection from ".";

describe("configuration", () => {
  describe("paginationRequired", () => {
    describe("when pagination is required", () => {
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

    describe("when pagination is not required", () => {
      const resolvers = {
        Query: {
          things: makeConnection({ paginationRequired: false })(() => fixtures),
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

  describe("toCursor", () => {
    const toCursor = (node: typeof fixtures[number]) =>
      node.value.split("").reverse().join("");

    const resolvers = {
      Query: {
        things: makeConnection({ toCursor })(() => fixtures),
      },
    };

    const server = new ApolloServer({ typeDefs, resolvers });

    it("uses a customer toCursor function", async () => {
      const result = await server.executeOperation({
        query: gql`
          query ($first: Int!) {
            things(first: $first) {
              edges {
                cursor

                node {
                  id
                  value
                }
              }
            }
          }
        `,
        variables: { first: 1 },
      });

      expect(result.errors).toBeNil();
      expect(result.data?.things.edges[0].cursor).toBe("CBA");
    });
  });
});
