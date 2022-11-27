

export interface Disqus {
  disqus: DisqusData;
}

export interface DisqusData {
  categroy: DisqusCategory;
  thread: DisqusThread[];
  post: DisqusPost[];
}

export interface DisqusCategory {
  '@_dsq:id': string;
  forum: string;
  title: string;
  isDefault: boolean;
}

export interface DisqusThread {
  '@_dsq:id': string;
  id: string;
  forum: string;
  category: ParentId;
  link: string;
  title: string;
  message: string;
  createdAt: string;
  author: Author;
  isClosed: boolean;
  isDeleted: boolean;
}

export interface DisqusPost {
  '@_dsq:id': string;
  id: string;
  message: string;
  createdAt: string;
  isDeleted: boolean;
  isSpam: boolean;
  author: Author;
  thread: ParentId;
  parent?: ParentId;
}

export interface Author {
  name: string;
  isAnonymous: boolean;
  username: string;
}

interface ParentId {
  '@_dsq:id': string;
}