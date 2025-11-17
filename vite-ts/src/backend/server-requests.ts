/* eslint-disable @typescript-eslint/no-explicit-any */
import neo4j from "neo4j-driver";
/**
 * Queries neo4j for any actors the parameter actor has acted with
 * @param actor_name actor to search for connections to
 * @returns actors and the movies they acted in
 */
export async function getConnectedActors(actor_name: string) {
  const URI = "bolt://localhost:7687";
  let driver: any;
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", "your_password"));
    await driver.getServerInfo();
  } catch (err: any) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    await driver.close();
    return;
  }

  const query = `MATCH (n:Person{name: $name})-[a:ACTED_IN]-(m:Movie)-[b:ACTED_IN]-(p:Person) RETURN DISTINCT ID(p) AS connected_id,p.name, m.title`;
  const result = await driver.executeQuery(
    `${query}`,
    { name: actor_name },
    {
      database: "neo4j",
    }
  );

  const connectedActors: any[] = [];

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i];
    const actorData = {
      id: record.get("connected_id"),
      data: { name: record.get("p.name"), movie: record.get("m.title") },
    };
    connectedActors.push(actorData);
  }

  await driver.close();

  return [connectedActors];
}

/**
 * Queries database for shortest path between two actors
 * @param startActor actor to start the path on
 * @param endActor actor to end the path on
 * @returns path between the two actors
 */
export async function shortestPath(startActor: string, endActor: string) {
  const URI = "bolt://localhost:7687";
  let driver: any;
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", "your_password"));
    await driver.getServerInfo();
  } catch (err: any) {
    //console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    await driver.close();
    return;
  }

  const query = `
      MATCH (a:Person {name: $startActor}), (b:Person {name: $endActor})
      MATCH path = shortestPath((a)-[:ACTED_IN*]-(b))
      RETURN path
    `;

  const result = await driver.executeQuery(`${query}`, {
    startActor,
    endActor,
  });

  if (result.records.length === 0) {
    console.log(`No path found between ${startActor} and ${endActor}.`);
    return null;
  }

  const record = result.records[0];
  const path = record.get("path");

  //get detailed info about nodes
  const nodes = path.segments
    ? path.segments.map((segment: any) => ({
        start: {
          labels: segment.start.labels,
          properties: segment.start.properties,
        },
        relationship: {
          type: segment.relationship.type,
          properties: segment.relationship.properties,
        },
        end: {
          labels: segment.end.labels,
          properties: segment.end.properties,
        },
      }))
    : [];
  await driver.close();
  return {
    start: startActor,
    end: endActor,
    length: path.length,
    segments: nodes,
  };
}

/**
 * gets two random actors to start the game. On easy difficulty, starting actors are limited to popularity >3.0.
 * On hard difficulty, there is no such restriction.
 * @param difficulty easy or hard; determines restriction on starting actors
 * @returns two random actors
 */
export async function getRandomActors(difficulty = "easy") {
  const URI = "bolt://localhost:7687";
  let driver: any;
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", "your_password"));
    await driver.getServerInfo();
    //console.log("neo4j driver connected");
  } catch (err: any) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    await driver.close();
    return;
  }
  let query = "";
  //check for difficulty; if easy, only choose most popular actors ranked by TMDB
  if (difficulty === "easy") {
    query = `
      MATCH (a:Person)
      WHERE a.name IS NOT NULL AND a.name <> "" AND a.popularity > 3.0
      WITH a, rand() AS r
      ORDER BY r
      LIMIT 1

      MATCH (a)-[:ACTED_IN*1..6]-(b:Person)
      WHERE a <> b AND b.name IS NOT NULL AND b.name <> "" AND b.popularity > 3.0
      WITH a, b, rand() AS r2
      ORDER BY r2
      LIMIT 1

      RETURN 
        a.id AS aId, a.name AS aName,
        b.id AS bId, b.name AS bName
    `;
  } else {
    query = `
      MATCH (a:Person)
      WHERE a.name IS NOT NULL AND a.name <> ""
      WITH a, rand() AS r
      ORDER BY r
      LIMIT 1

      MATCH (a)-[:ACTED_IN*1..6]-(b:Person)
      WHERE a <> b AND b.name IS NOT NULL AND b.name <> ""
      WITH a, b, rand() AS r2
      ORDER BY r2
      LIMIT 1

      RETURN 
        a.id AS aId, a.name AS aName,
        b.id AS bId, b.name AS bName
    `;
  }

  //console.log("executing query");
  const result = await driver.executeQuery(`${query}`);
  //console.log("returning records");
  const record = result.records[0];
  //console.log(record);
  await driver.close();
  return {
    actor1: {
      id: record.get("aId"),
      name: record.get("aName"),
    },
    actor2: {
      id: record.get("bId"),
      name: record.get("bName"),
    },
  };
}
