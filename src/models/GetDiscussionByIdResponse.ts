export interface GetDiscussionByIdResponse {
  data: {
    node: {
      id: string;
      body: string;
      url: string;
      comments: Comments;
    }
  };
}

export interface Comments {
  totalCount: number;
  pageInfo: PageInfo;
  nodes: ReplyNode[];
}

export interface ReplyNode {
  id: string;
  body: string;
  replies: Replies;
}

export interface Replies {
  totalCount: number;
  nodes: Node[];
}

export interface Node {
  id: string;
  body: string;
  replyTo: ReplyTo;
}

export interface ReplyTo {
  id: string;
}

export interface PageInfo {
  startCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string;
}