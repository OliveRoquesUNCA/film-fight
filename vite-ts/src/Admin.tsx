import { searchPerson } from "./server-requests";

async function search(formData: any) {
  const query = formData.get("query");
  console.log(query);
  searchPerson(query);
}
export default function Admin() {
  return (
    <div>
      <h1>Admin Page</h1>
      <div>
        <form action={search}>
          Input actor to search TMDB for:
          <input name="query"></input>
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
