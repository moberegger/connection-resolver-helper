/// <reference types="jest-extended" />

import { ApolloServer } from "apollo-server";
import { GraphQLError } from "graphql";
import gql from "graphql-tag";

import { fixtures, typeDefs } from "./fixtures";

import { makeConnection } from ".";

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
    expect(error?.message).toBe('Argument "after" is invalid.');
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
    expect(error?.message).toBe('Argument "before" is invalid.');
  });
});
