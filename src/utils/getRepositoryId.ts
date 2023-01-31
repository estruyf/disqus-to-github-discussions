import fetch from "node-fetch";
import { GRAPHQL_API } from "../constants";


export const getRepositoryId = async (token: string) => {
  
  const response = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      "User-Agent": "disqus-migration",
    },
    body: JSON.stringify({
      query: `
        query FindRepo {
          repository(owner: "${process.env.OWNER}" name: "${process.env.REPOSITORY}") {
            id
          }
        }
      `
    }),
  }).then((r) => r.json());

  if (process.env.DEBUG === "TRUE") {
    console.log("DBUG response for getRepositoryId:")
    console.log(JSON.stringify(response, null, 2));
  }

  if (response.data.repository.id) {
    return response.data.repository.id;
  }

  return;
}