import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface IProgress { 
  threads: { [id: string]: string };
  comments: { [id: string]: string };
  replies: { [id: string]: string };
}

const DEFAULT_CONTENT = { threads: {}, comments: {}, replies: {}, };

export const getProgress = (): IProgress => {
  try {
    const processContents = readFileSync(join(__dirname, `../../process.json`), 'utf8');

    const process = processContents ? JSON.parse(processContents) : DEFAULT_CONTENT;

    if (process.threads === undefined) {
      process.threads = {};
    }
    if (process.comments === undefined) {
      process.comments = {};
    }
    if (process.replies === undefined) {
      process.replies = {};
    }

    return process;
  } catch (e) {
    return DEFAULT_CONTENT;
  }
}

const storeProgress = (process: any) => {
  writeFileSync(join(__dirname, `../../process.json`), JSON.stringify(process, null, 2));
}

export const storeThread = (dqsId: string, discussionId: string) => {
  const progress = getProgress();

  if (!progress.threads) {
    progress.threads = {};
  }

  progress.threads[dqsId] = discussionId;

  storeProgress(progress);
}

export const storeComment = (dqsId: string, discussionId: string) => {
  const progress = getProgress();

  if (!progress.comments) {
    progress.comments = {};
  }

  progress.comments[dqsId] = discussionId;

  storeProgress(progress);
}

export const storeReply = (dqsId: string, discussionId: string) => {
  const progress = getProgress();

  if (!progress.replies) {
    progress.replies = {};
  }

  progress.replies[dqsId] = discussionId;

  storeProgress(progress);
}

export const logError = (message: string) => {
  let log: string = "";

  try {
    log = readFileSync(join(__dirname, `../../errors.log`), 'utf8')
  } catch (e) {
    // ignore
  }

  log += `
--- ${new Date().toISOString()} ---
${message}
---
`;

  writeFileSync(join(__dirname, `../../errors.log`), log, 'utf8');
}