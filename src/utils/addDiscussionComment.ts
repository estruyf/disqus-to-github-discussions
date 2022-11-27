import { format } from "date-fns";
import fetch from "node-fetch";
import { GRAPHQL_API } from "../constants";
import { DisqusPost } from "../models/Disqus";
import TurndownService from "turndown";
import { sleep } from "./sleep";
import { Authentication, Settings } from "../service";
import { GraphQLResponse } from "../models";
import { logError } from "./processLogger";


export interface AddDiscussionCommentResponse extends GraphQLResponse {
  data: {
    addDiscussionComment: {
      comment: {
        id: string;
      };
    };
  };
}


export const addDiscussionComment = async (token: string, discussionId: string, comment: DisqusPost, replyId?: string, retry: number = 0): Promise<string | undefined> => {

  const turndownService = new TurndownService();
  // Replace image links with image markup
  turndownService.addRule("imgToHyperlink", {
    filter: ["a"],
    replacement: (content: string, node: HTMLElement | Document | DocumentFragment) => {
      const href = (node as HTMLElement).getAttribute("href");
      if (href && (href.endsWith(".jpg") || href.endsWith(".png") || href.endsWith(".gif") || href.endsWith(".jpeg"))) {
        return `![${content}](${href})`;
      } else {
        return `[${content}](${href})`;
      }
    }
  })
  const markdown = turndownService.turndown(comment.message);

  let author = comment.author?.name;
  if (process.env.DISQUS_USERNAME && process.env.DISQUS_USERNAME === comment.author?.username) {
    author = "";
  }
  
  const response: AddDiscussionCommentResponse = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      "User-Agent": "disqus-migration",
    },
    body: JSON.stringify({
      query: `
        mutation($body: String! $discussionId: ID! $replyId: ID) {
          addDiscussionComment(input: {
            body: $body
            discussionId: $discussionId
            replyToId: $replyId
          }) {
            comment {
              id
            }
          }
        }
      `,
      variables: {
        discussionId,
        body: `\`\`\`header
Originally posted${author ? ` by ${comment.author.name}` : ""} on ${format(new Date(comment.createdAt), "yyyy-MM-dd HH:mm")}
\`\`\`

${markdown}

<!-- disqus_id:${comment["@_dsq:id"]} -->
        `,
        replyId: replyId || null
      },
    }),
  }).then((r) => r.json());

  if (response?.data?.addDiscussionComment?.comment?.id) {
    return response.data.addDiscussionComment.comment.id;
  } else {
    console.error(response);
    
    if (response.errors) {
      const firstError = response.errors[0];
      if (firstError.type === "FORBIDDEN") {
        logError(`Error adding ${replyId ? "reply" : "comment"} (Disqus ID: ${comment["@_dsq:id"]}) to discussion (GitHub ID: ${discussionId}): ${firstError.message}`);
        console.log(`- FORBIDDEN: ${comment["@_dsq:id"]} - ${firstError.message}`);
        return;
      } else if (firstError.type === "UNPROCESSABLE" && firstError.message !== "was submitted too quickly") {
        logError(`Error adding ${replyId ? "reply" : "comment"} (Disqus ID: ${comment["@_dsq:id"]}) to discussion (GitHub ID: ${discussionId}): ${firstError.message}`);
        console.log(`- UNPROCESSABLE: ${comment["@_dsq:id"]} - ${firstError.message}`);
        return;
      }
    }

    if (response.message === "Bad credentials") {
      console.log(`- Bad credentials: time to fetch a new token`);
      const token = await Authentication.getToken();
      return addDiscussionComment(token, discussionId, comment, replyId, retry);
    }
    
    if (retry < Settings.getApiRetries()) {
      ++retry;
      console.log(`- Waiting ${retry * 60} seconds before retrying...`);
      await sleep(retry * 60000);
      return addDiscussionComment(token, discussionId, comment, replyId, retry);
    }

    logError(`Error adding ${replyId ? "reply" : "comment"} (Disqus ID: ${comment["@_dsq:id"]}) to discussion (GitHub ID: ${discussionId}): ${JSON.stringify(response)}`);
  }

  return;
}