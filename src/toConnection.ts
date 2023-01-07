import once from "lodash.once";

import GraphQLConnectionError from "./GraphQLConnectionError";

import type { GetTotalCountFunction, ToCursorFunction } from "./makeConnection";
import type { Connection, ConnectionArguments, Edge } from "graphql-relay";

export interface ExtendedEdge<Root, Node> extends Edge<Node> {
  root: Root;
}

export interface ExtendedConnection<Root, Node> extends Connection<Node> {
  edges: ExtendedEdge<Root, Node>[];
  nodes: Node[];
  totalCount: number;
}

const throwCursorError = (arg: string, cursor: string) => {
  throw new GraphQLConnectionError(
    `No record found for the provided "${arg}" cursor: "${cursor}".`
  );
};

export const toEdge =
  <Node>(args: ConnectionArguments, toCursor: ToCursorFunction<Node>) =>
  <Root>(index: number, root: Root, node: Node): ExtendedEdge<Root, Node> => {
    const getCursor = once(() =>
      Buffer.from(
        `arrayconnection:${toCursor(node, args, index)}`,
        "utf8"
      ).toString("base64")
    );

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
  toCursor: ToCursorFunction<Node>,
  getTotalCount: GetTotalCountFunction<Root, Node>
): ExtendedConnection<Root, Node> => {
  const { first, after, before, last } = args;
  const afterIsDefined = typeof after === "string";
  const beforeIsDefined = typeof before === "string";
  const firstIsDefined = typeof first === "number";
  const lastIsDefined = typeof last === "number";

  const makeEdge = toEdge(args, toCursor);

  const getEdges = once(() => {
    const allEdges: ExtendedEdge<Root, Node>[] = [];
    let edges = allEdges;
    let afterOffset = afterIsDefined ? -1 : 0;
    let beforeOffset = beforeIsDefined ? -1 : data.length;

    data.forEach((node, index) => {
      const edge = makeEdge(index, root, node);
      allEdges.push(edge);

      if (afterIsDefined && edge.cursor === after) afterOffset = index;
      if (beforeIsDefined && edge.cursor === before) beforeOffset = index;
    });

    if (afterOffset === -1) throwCursorError("after", after!);
    if (beforeOffset === -1) throwCursorError("before", before!);
    // TODO: Validate that end isn't before start

    let startOffset = 0;
    let endOffset = data.length;

    if (firstIsDefined) {
      startOffset = afterIsDefined ? afterOffset + 1 : afterOffset;
      endOffset = Math.min(beforeOffset, startOffset + first);
      edges = allEdges.slice(startOffset, endOffset);
    }

    if (lastIsDefined) {
      startOffset = Math.max(afterOffset, beforeOffset - last);
      endOffset = beforeOffset;
      edges = allEdges.slice(startOffset, endOffset);
    }

    return {
      edges,
      meta: {
        afterOffset,
        beforeOffset,
        startOffset,
        endOffset,
      },
    };
  });

  const getNodes = once(() => getEdges().edges.map((edge) => edge.node));

  return {
    get pageInfo() {
      const {
        edges,
        meta: { afterOffset, beforeOffset, startOffset, endOffset },
      } = getEdges();

      return {
        get hasNextPage() {
          if (lastIsDefined || edges.length === 0) return false;

          return endOffset < (beforeIsDefined ? beforeOffset : data.length);
        },
        get hasPreviousPage() {
          if (firstIsDefined || edges.length === 0) return false;

          return startOffset > (afterIsDefined ? afterOffset + 1 : 0);
        },
        get startCursor() {
          return edges.at(0)?.cursor ?? null;
        },
        get endCursor() {
          return edges.at(-1)?.cursor ?? null;
        },
      };
    },
    get nodes() {
      return getNodes();
    },
    get edges() {
      return getEdges().edges;
    },
    get totalCount() {
      return getTotalCount(root, data, args);
    },
  };
};
