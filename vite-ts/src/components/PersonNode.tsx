import type { Node, NodeProps } from "@xyflow/react";

type PersonNode = Node<{ name: string }, "person">;

export default function PersonNode({ data }: NodeProps<PersonNode>) {
  return <div>Name: {data.name}</div>;
}
