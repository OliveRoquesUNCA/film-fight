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
  let count = 2;
  for (let i = 0; i < result.records.length; i++) {
    let record = result.records[i];
    //console.log(record);
    nodeData.push({
      id: `${count}`,
      name: `${record.get(0)}`,
    });
    count++;
    nodeData.push({
      id: `${count}`,
      title: `${record.get(2)}`,
    });
    count++;
    edgeData.push({
      id: `${count}`,
      roles: `${record.get(1)}`,
      from: `${count - 2}`,
      to: `${count - 1}`,
    });
    count++;
  }
  await driver.close();
  return [nodeData, edgeData];
}
