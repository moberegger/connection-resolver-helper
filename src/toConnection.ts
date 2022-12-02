import { Connection, ConnectionArguments, Edge } from "graphql-relay";
import once from "lodash.once";

import GraphQLConnectionError from "./GraphQLConnectionError";
import type { ToCursorFunction } from ".";

export interface ExtendedEdge<Root, Node> extends Edge<Node> {
  root: Root;
}

export interface ExtendedConnection<Root, Node> extends Connection<Node> {
  edges: ExtendedEdge<Root, Node>[];
  nodes: Node[];
  totalCount: number;
}

export const toEdge =
  <Node>(toCursor: ToCursorFunction<Node>) =>
  <Root>(index: number, root: Root, node: Node): ExtendedEdge<Root, Node> => {
    const getCursor = once(() => toCursor(node, index));
    return {
      root,
      node,
      get cursor() {
        return getCursor();
      },
    };
  };

export const toConnection = <Root, Node>(
  root: Root,
  data: Node[],
  args: ConnectionArguments,
  toCursor: ToCursorFunction<Node>
): ExtendedConnection<Root, Node> => {
  const { first, after, before, last } = args;

  const isForwardsPagination = typeof first === "number";
  const isBackwardsPagination = typeof last === "number";

  const getEdges = once(() => {
    const edges = data.map((node, index) =>
      toEdge(toCursor)(index, root, node)
    );

    if (isForwardsPagination) {
      let startIdx = after
        ? edges.findIndex((edge) => edge.cursor === after)
        : 0;

      if (startIdx === -1)
        throw new GraphQLConnectionError(
          `No record found for the provided "after" cursor: "${after}".`
        );

      if (after) startIdx += 1;

      return edges.slice(startIdx, startIdx + first);
    }

    if (isBackwardsPagination) {
      const endIdx = before
        ? edges.findIndex((edge) => edge.cursor === before)
        : edges.length;

      if (endIdx === -1)
        throw new GraphQLConnectionError(
          `No record found for the provided "before" cursor: "${before}".`
        );

      return edges.slice(endIdx - last, endIdx);
    }

    return edges;
  });

  const getNodes = once(() => getEdges().map((edge) => edge.node));

  return {
    get pageInfo() {
      return {
        get hasNextPage() {
          const edges = getEdges();

          if (isBackwardsPagination || edges.length === 0) return false;

          return (
            edges.at(-1)!.cursor !== toCursor(data.at(-1)!, data.length - 1)
          );
        },
        get hasPreviousPage() {
          const edges = getEdges();

          if (isForwardsPagination || edges.length === 0) return false;

          return edges.at(0)!.cursor !== toCursor(data.at(0)!, 0);
        },
        get startCursor() {
          return getEdges().at(0)?.cursor ?? null;
        },
        get endCursor() {
          return getEdges().at(-1)?.cursor ?? null;
        },
      };
    },
    get nodes() {
      return getNodes();
    },
    get edges() {
      return getEdges();
    },
    get totalCount() {
      return data.length;
    },
  };
};
