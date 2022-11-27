import fetch from "node-fetch";
import { GRAPHQL_API } from "../constants";
import { GraphQLResponse } from "../models";
import { Authentication, Settings } from "../service";
import { logError } from "./processLogger";
import { sleep } from "./sleep";


export interface CreateDiscussionResponse extends GraphQLResponse {
  data: {
    createDiscussion: {
      discussion: {
        id: string;
      };
    };
  };
}


export const createDiscussion = async (token: string, repoId: string, categoryId: string, slug: string, articleTitle: string, articleUrl: string, retry: number = 0): Promise<string | undefined> => {
  
  const response: CreateDiscussionResponse = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      "User-Agent": "disqus-migration",
    },
    body: JSON.stringify({
      query: `
        mutation($categoryId: ID! $repositoryId: ID! $title: String! $body: String!) {
          createDiscussion(input: {
            categoryId: $categoryId
            repositoryId: $repositoryId
            title: $title
            body: $body
          }) {
            discussion {
              id
            }
          }
        }
      `,
      variables: {
        repositoryId: repoId,
        categoryId: categoryId,
        title: slug,
        body: `${articleTitle}
        
[${articleUrl}](${articleUrl})`,
      },
    }),
  }).then((r) => r.json());

  // console.log(JSON.stringify(response, null, 2));

  if (response?.data?.createDiscussion?.discussion?.id) {
    return response.data.createDiscussion.discussion.id;
  } else {
    if (response.errors) {
      const firstError = response.errors[0];
      if (firstError.type === "FORBIDDEN") {
        logError(`Error creating a discussion ${slug}: ${firstError.message}`);
        console.log(`- FORBIDDEN: ${firstError.message}`);
        return;
      }
    }

    if (response.message === "Bad credentials") {
      console.log(`- Bad credentials: time to fetch a new token`);
      const token = await Authentication.getToken();
      return createDiscussion(token, repoId, categoryId, slug, articleTitle, articleUrl, retry);
    }

    if (retry < Settings.getApiRetries()) {
      ++retry;
      console.log(`- Waiting ${retry * 60} seconds before retrying...`);
      await sleep(retry * 60000);
      return createDiscussion(token, repoId, categoryId, slug, articleTitle, articleUrl, ++retry);
    }

    logError(`Error creating a discussion ${slug}: ${JSON.stringify(response)}`);
    console.error(response);
  }

  return;
}