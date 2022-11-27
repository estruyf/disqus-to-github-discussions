import fetch from "node-fetch";
import { GRAPHQL_API } from "../constants";

export const getCategories = async (token: string) => {
  const query = `repo:${process.env.OWNER}/${process.env.REPOSITORY} fork:true`;

  const rawData = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      "User-Agent": "disqus-migration",
    },
    body: JSON.stringify({
      query: `
        query($query: String!) {
          search(type: REPOSITORY query: $query first:1) {
            nodes {
              ... on Repository {
                id
                discussionCategories(first: 100) {
                  nodes {
                    id
                    name
                    emojiHTML
                  }
                }
              }
            }
          }
        }
      `,
      variables: { query },
    }),
  }).then((r) => r.json());

  if (rawData && rawData.data && rawData.data.search && rawData.data.search.nodes) {
    const categories = [];

    for (const node of rawData.data.search.nodes) {
      if (node.discussionCategories && node.discussionCategories.nodes) {
        for (const category of node.discussionCategories.nodes) {
          categories.push(category);
        }
      }
    }

    return categories;
  }

  return;
}