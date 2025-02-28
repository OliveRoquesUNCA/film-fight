import dotenv
import os
from neo4j import GraphDatabase


load_status = dotenv.load_dotenv("credentials.txt")
if load_status is False:
    raise RuntimeError('Environment variables not loaded.')

URI = os.getenv("NEO4J_URI")
AUTH = (os.getenv("NEO4J_USERNAME"), os.getenv("NEO4J_PASSWORD"))

films = [{"name": "Pulp Fiction", "year": 1994, "actors":["John Travolta", "Samuel L Jackson", "Uma Thurman"]},
          {"name": "The Avengers", "year": 2012, "actors":["Samuel L Jackson", "Chris Evans", "Scarlett Johansson"]},
          {"name": "Knives Out", "year": 2019, "actors": ["Chris Evans", "Daniel Craig", "Jamie Lee Curtis"]},
          {"name": "Scott Pilgrim vs. the World", "year": 2010, "actors": ["Michael Cera", "Chris Evans", "Anna Kendrick"]}]

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    try:

        # Create some nodes
        for film in films:
            records, summary, keys = driver.execute_query(
                "MERGE (f:Film {name: $film.name, year: $film.year})",
                film=film,
                database_="neo4j",
            )
            for actor in film["actors"]:
                records, summary, keys = driver.execute_query(
                "MERGE (a:Actor {name: $actor})",
                actor=actor,
                database_="neo4j",
            )

        # Create some relationships
        for film in films:
            if film.get("actors"):
                records, summary, keys = driver.execute_query("""
                    MATCH (f:Film {name: $film.name})
                    UNWIND $film.actors AS actor_name
                    MATCH (a:Actor {name: actor_name})
                    MERGE (f)-[:HAS]->(a)
                    """, film=film,
                    database_="neo4j",
                )

        # Retrieve Films which have Chris Evans
        records, summary, keys = driver.execute_query("""
            MATCH (f:Film)-[:HAS]-(a:Actor{name: $name})
            RETURN f.name, a
            """, name="Chris Evans",
            routing_="r",
            database_="neo4j",
        )
        # Loop through results
        for record in records:
            print(record.data())

        
        # Summary information
        print("The query `{query}` returned {records_count} records in {time} ms.".format(
            query=summary.query, records_count=len(records),
            time=summary.result_available_after
        ))

    except Exception as e:
        print(e)
        # further logging/processing
