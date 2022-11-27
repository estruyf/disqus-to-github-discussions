import { DisqusPost } from "../models";


export const getRootComment = (comments: DisqusPost[], parentId: string): string | undefined => {

  const parent = comments.find(c => c["@_dsq:id"] === parentId);
  if (parent && parent.parent) {
    return getRootComment(comments, parent.parent["@_dsq:id"]);
  }

  return parent?.["@_dsq:id"];
}