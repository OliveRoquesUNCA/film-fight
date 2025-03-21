import neo4j from "neo4j-driver";

export async function queryServer(query) {
  const URI = "neo4j://localhost";
  let driver;
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic());
    await driver.getServerInfo();
  } catch (err) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    await driver.close();
    return;
  }
  let result = await driver.executeQuery(
    `${query}`,
    {},
    {
      database: "neo4j",
    }
  );
  let nodeData = [];
  let edgeData = [];
  for (let i = 0; i < result.records.length; i++) {
    let record = result.records[i];
    //console.log(record);
    nodeData.push({
      id: `${record.get("person_id")}`,
      caption: `${record.get("n.name")}`,
    });
    nodeData.push({
      id: `${record.get("movie_id")}`,
      caption: `${record.get("m.title")}`,
    });
    edgeData.push({
      id: `${record.get("edge_id")}`,
      caption: `${record.get("a.roles")}`,
      from: `${record.get("person_id")}`,
      to: `${record.get("movie_id")}`,
    });
  }
  await driver.close();
  console.log(nodeData);
  console.log(edgeData);
  return [nodeData, edgeData];
}
