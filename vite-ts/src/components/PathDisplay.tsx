export default function PathDisplay({ nodes }: { nodes: any[] }) {
  return (
    <div>
      {nodes.map((node: any, index: number) => (
        <div style={{ color: "lightblue" }} key={index}>
          {node.start.properties.name}
          {node.end.properties.name}
        </div>
      ))}
    </div>
  );
}
