import { getRootComment } from './utils/getRootComment';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { XMLParser } from 'fast-xml-parser';
import { Category, Disqus, DisqusPost } from "./models";
import { Authentication, Settings } from './service';
import { addDiscussionComment, createDiscussion, getCategories, getProgress, getRateLimit, getRepositoryId, logError, sleep, storeComment, storeReply, storeThread } from './utils';
import { getDiscussionById } from './utils/getDiscussionById';

dotenv.config();

const sleepTime = Settings.getSleepTime();

if (!process.env.XML_FILE) {
  throw new Error("XML_FILE environment variable is not set");
}

// Ensure that dates in the imported comments are displayed in UTC
process.env.TZ = "UTC"

const xmlData = readFileSync(join(__dirname, "../", process.env.XML_FILE), "utf8");

(async () => {
  const parser = new XMLParser({
    ignoreAttributes: false,
  });
  const jObj: Disqus = parser.parse(xmlData);

  // Get app access token
  const accessToken = await Authentication.getToken();
  // await getRateLimit(accessToken);

  const repoId = await getRepositoryId(accessToken);

  const progress = getProgress();

  if (jObj.disqus) {
    const dqsData = jObj.disqus;

    const threads = [];

    // Process all threads
    for (const thread of dqsData.thread) {
      threads.push({
        ...thread,
        dqsId: thread['@_dsq:id'],
        comments: [] as DisqusPost[]
      });
    }

    // Process all comments
    for (const thread of threads) {
      const comments = dqsData.post.filter((post: any) => post.thread['@_dsq:id'] === thread.dqsId);

      thread.comments = comments.filter(c => {
        if (c.isDeleted || c.isSpam) {
          return false;
        }

        // Check if the reply is already processed
        if (c.parent) {
          return progress?.replies?.[c['@_dsq:id']] === undefined;
        }

        // Check if the comment is already processed
        return progress?.comments?.[c['@_dsq:id']] === undefined;
      });
    }

    // Retrieve the github discussion categories
    const categories: Category[] | undefined = await getCategories(accessToken);
    
    const category = categories?.find((c) => c.name === process.env.CATEGORY_NAME);
    if (!category) {
      throw new Error(`Category ${process.env.CATEGORY_NAME} not found`);
    }

    // Start creating the discussions
    for (const thread of threads) {

      // URLs to ignore
      if (process.env.SITE_URL && !thread.link.startsWith(process.env.SITE_URL)) {
        console.log(`Ignoring thread: ${thread.link}`);
        console.log(``);
        continue;
      }

      const uri = new URL(thread.link);
      const slug = uri.pathname;
      if (!slug) {
        console.log(`No slug found for ${thread.link}`);
        continue;
      }

      // If path contains a query string, don't process it
      if (uri.search) {
        console.log(`Ignoring thread: ${thread.link}`);
        console.log(``);
        continue;
      }

      console.log(`Processing ${slug}`);

      let discussionId = null;
      // Check if the discussion is already created
      if (!progress.threads[thread.dqsId]) {
        discussionId = await createDiscussion(accessToken, repoId, category.id, slug, thread.title, thread.link);

        if (discussionId) {
          storeThread(thread["@_dsq:id"], discussionId);
        }

        await sleep(sleepTime);
      } else {
        discussionId = progress.threads[thread.dqsId];
      }

      if (!discussionId) {
        continue;
      }

      let discussionComments: { [disqusId: string]: string | undefined } = {};
      let discussionReplies: { [disqusId: string]: string | undefined } = {};

      const comments = thread.comments.filter(c => !c.parent);
      const replies = thread.comments.filter(c => c.parent);

      if (comments.length > 0 || replies.length > 0) {
        const crntDiscussion = await getDiscussionById(accessToken, discussionId);

        // Process all comments
        for (const comment of comments) {
          if (!comment["@_dsq:id"]) {
            continue;
          }

          // Check if the comment is already created
          if (crntDiscussion) {
            const existingComment = crntDiscussion.comments.nodes.find(c => c.body.includes(`disqus_id:${comment["@_dsq:id"]}`))
            if (existingComment) {
              console.log(`- Comment ${comment["@_dsq:id"]} already created`);
              storeComment(comment["@_dsq:id"], existingComment.id);
              continue;
            }
          }

          // Add a comment
          console.log(`- Adding a comment`);
          const commentId = await addDiscussionComment(accessToken, discussionId, comment);
          discussionComments[comment["@_dsq:id"]] = commentId;

          if (commentId) {
            storeComment(comment["@_dsq:id"], commentId);
          }

          await sleep(sleepTime);
        }

        // Process all replies
        for (const reply of replies) {
          if (!reply || !reply.parent || !reply.parent?.["@_dsq:id"]) {
            continue;
          }

          // Check if parent comment is already created, otherwise skip the reply
          let parentId = reply.parent?.["@_dsq:id"];
          if (!progress.comments[parentId] && !discussionComments[parentId]) {
            // It could be it is a sub-reply
            const allComments = dqsData.post.filter((post: any) => post.thread['@_dsq:id'] === thread.dqsId)
            const rootId = getRootComment(allComments, parentId);
            if (rootId) {
              parentId = rootId;
            }
          }

          if (!progress.comments[parentId] && !discussionComments[parentId]) {
            continue;
          }

          // Check if the reply is already created
          let replyExists = false;
          for (const comment of crntDiscussion?.comments.nodes || []) {
            if (comment) {
              const existingReply = comment.replies.nodes.find(c => c.body.includes(`disqus_id:${reply["@_dsq:id"]}`));
              if (existingReply) {
                storeReply(reply["@_dsq:id"], existingReply.id);
                replyExists = true;
                break;
              }
            }
          }

          if (replyExists) {
            console.log(`- Reply ${reply["@_dsq:id"]} already created`);
            continue;
          }

          let replyId = discussionComments[parentId] || progress.comments[parentId];

          // Add a reply if the ID is found
          if (replyId) {
            console.log(`- Adding a reply`);
            const commentId = await addDiscussionComment(accessToken, discussionId, reply, replyId);
            discussionReplies[reply["@_dsq:id"]] = commentId;

            if (commentId) {
              storeReply(reply["@_dsq:id"], commentId);
            }

            await sleep(sleepTime);
          } else {
            console.log(`- Reply ${reply["@_dsq:id"]} not created`);
            logError(`Reply ${reply["@_dsq:id"]} not created`);
          }
        }
      }

      console.log(`- Processing done`);
      console.log(``);
    }
  }
})();