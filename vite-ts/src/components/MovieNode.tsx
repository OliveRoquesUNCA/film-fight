import type { Node, NodeProps } from "@xyflow/react";

type MovieNodeData = { title: string; released: number };
type MovieNode = Node<MovieNodeData, "movie">;

export default function MovieNode({ data }: NodeProps<MovieNode>) {
  return (
    <div>
      Title: {data.title} Released: {data.released}
    </div>
  );
}
