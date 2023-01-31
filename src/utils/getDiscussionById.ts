import { GetDiscussionByIdResponse } from './../models/GetDiscussionByIdResponse';
import fetch from "node-fetch";
import { GRAPHQL_API } from "../constants";


export const getDiscussionById = async (token: string, discussionId: string) => {

  const rawData: GetDiscussionByIdResponse = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },

    body: JSON.stringify({
      query: `
        query {
          node(id: "${discussionId}") {
            ... on Discussion {
              id
              body
              url
              comments(first: 100) {
                totalCount
                pageInfo {
                  startCursor
                  hasNextPage
                  hasPreviousPage
                  endCursor
                }
                nodes {
                  id
                  body
                  replies(first: 100) {
                    totalCount
                    nodes {
                      id
                      body
                      replyTo {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `
    }),
  }).then((r) => r.json());

  if (process.env.DEBUG === "TRUE") {
    console.log("DEBUG response for getDiscussionById:")
    console.log(JSON.stringify(rawData, null, 2));
  }

  if (rawData && rawData.data && rawData.data.node) {
    return rawData.data.node;
  }

  return;
}