declare module 'apollo-upload-client/UploadHttpLink.mjs' {
  import { ApolloLink } from '@apollo/client/core';

  export interface UploadHttpLinkOptions {
    uri?: string;
    fetch?: WindowOrWorkerGlobalScope['fetch'];
    fetchOptions?: RequestInit;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    includeExtensions?: boolean;
  }

  export default class UploadHttpLink extends ApolloLink {
    constructor(options?: UploadHttpLinkOptions);
  }
}

declare module 'apollo-upload-client' {
  import { ApolloLink } from '@apollo/client/core';

  export interface UploadLinkOptions {
    uri?: string;
    fetch?: WindowOrWorkerGlobalScope['fetch'];
    fetchOptions?: RequestInit;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    includeExtensions?: boolean;
  }

  export function createUploadLink(options?: UploadLinkOptions): ApolloLink;
}
