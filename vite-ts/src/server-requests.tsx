import neo4j from "neo4j-driver";

export async function getTestGraph() {
  const URI = "neo4j://localhost";
  let driver: any;
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic("", ""));
    await driver.getServerInfo();
  } catch (err: any) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    await driver.close();
    return;
  }
  let query =
    "MATCH (n:Person)-[a:ACTED_IN]-(m:Movie) RETURN DISTINCT ID(n) AS person_id,n.name,ID(a) AS edge_id,ID(m) AS movie_id, m.title,m.released LIMIT 10";
  let result = await driver.executeQuery(
    `${query}`,
    {},
    {
      database: "neo4j",
    }
  );
  let personNodeData: any[] = [];
  let movieNodeData: any[] = [];
  let actedEdgeData: any[] = [];
  //console.log(result.records);
  for (let i = 0; i < result.records.length; i++) {
    let record = result.records[i];
    const personData = {
      id: record.get("person_id"),
      data: { name: record.get("n.name") },
    };
    personNodeData.push(personData);
    let movie_id = Number(record.get("movie_id")) + 50;
    const movieData = {
      id: movie_id,
      data: {
        title: record.get("m.title"),
        released: record.get("m.released"),
      },
    };
    movieNodeData.push(movieData);
    const edgeData = {
      id: record.get("edge_id"),
      data: {
        from: record.get("person_id"),
        to: movie_id,
      },
    };
    actedEdgeData.push(edgeData);
  }
  await driver.close();
  console.log(personNodeData);
  console.log(movieNodeData);
  console.log(actedEdgeData);
  return [personNodeData, movieNodeData, actedEdgeData];
}
