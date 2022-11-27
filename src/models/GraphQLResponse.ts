

export interface GraphQLResponse {
  errors: {
    type: string;
    message: string;
  }[];
  message: string;
  documentation_url: string;
}