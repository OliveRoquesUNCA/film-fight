import React from "react";

type Node = {
  start: { labels: string[]; properties: any };
  end: { labels: string[]; properties: any };
};

interface PathDisplayProps {
  nodes: Node[];
}

const PathDisplay: React.FC<PathDisplayProps> = ({ nodes }) => {
  // Helper to get display name for a node
  const getNodeLabel = (node: { labels: string[]; properties: any }) => {
    if (!node) return null;
    if (node.labels.includes("Person"))
      return node.properties.name?.trim() || null;
    if (node.labels.includes("Movie"))
      return node.properties.title?.trim() || null;
    return null;
  };

  const cleanedPath = nodes
    .map((node) => {
      const startLabel = getNodeLabel(node.start);
      const endLabel = getNodeLabel(node.end);
      if (!startLabel || !endLabel) return null;
      return { start: startLabel, end: endLabel };
    })
    .filter(Boolean) as { start: string; end: string }[];

  // Deduplicate consecutive names
  const seenNames = new Set<string>();
  const uniquePairs: { start: string; end: string }[] = [];

  cleanedPath.forEach(({ start, end }) => {
    if (!seenNames.has(start) || !seenNames.has(end)) {
      uniquePairs.push({ start, end });
      seenNames.add(start);
      seenNames.add(end);
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {uniquePairs.map((pair, index) => (
        <div key={index} style={{ color: "lightblue" }}>
          ({pair.start}) → ({pair.end})
        </div>
      ))}
    </div>
  );
};

export default PathDisplay;
