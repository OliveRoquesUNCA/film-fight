import {
  getStraightPath,
  BaseEdge,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

type ActedInEdge = Edge<{ roles: string[] }, "ActedIn">;

export default function ActedInEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<ActedInEdge>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return <BaseEdge id={id} path={edgePath} />;
}
