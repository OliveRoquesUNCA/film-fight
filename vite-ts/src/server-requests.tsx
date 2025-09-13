/* eslint-disable @typescript-eslint/no-explicit-any */
import neo4j from "neo4j-driver";
import { MovieDb } from "moviedb-promise";

//note: create your own .env folder in this directory, and add your api key in it labeled API_KEY=[api key here]
const tmdbConfig = {
  apikey: `${import.meta.env.VITE_API_KEY}`,
};
const moviedb = new MovieDb(tmdbConfig.apikey);
export async function getConnectedActors(actor_name: string) {
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

  const query = `MATCH (n:Person{name: $name})-[a:ACTED_IN]-(m:Movie)-[b:ACTED_IN]-(p:Person) RETURN DISTINCT ID(p) AS connected_id,p.name, m.title`;
  const result = await driver.executeQuery(
    `${query}`,
    { name: actor_name },
    {
      database: "neo4j",
    }
  );

  const connectedActors: any[] = [];
  //let movies: any[] = [];
  //let edges: any[] = [];
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

export async function getRandomActor(exclude: string | undefined) {
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
  const actor: any[] = [];
  let actorData = {};

  let match = true;
  while (match) {
    const query = `MATCH (a)-[:ACTED_IN]->(t) RETURN ID(a) AS actor_id, a.name, rand() as r ORDER BY r LIMIT 1`;
    const result = await driver.executeQuery(
      `${query}`,
      {},
      {
        database: "neo4j",
      }
    );
    const record = result.records[0];

    actorData = {
      id: record.get("actor_id"),
      data: { name: record.get("a.name") },
    };
    if (record.get("a.name") !== exclude || exclude === undefined) {
      match = false;
    }
  }
  actor.push(actorData);
  await driver.close();

  return actor;
}

export const searchPerson = async (req: any) => {
  console.log(`query: ${req}`);
  const parameters = {
    query: req,
    page: 1,
  };
  try {
    const res = await moviedb.searchPerson(parameters);
    return res.results;
  } catch (error) {
    return "error" + console.error();
  }
};
