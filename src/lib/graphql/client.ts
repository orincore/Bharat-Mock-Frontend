import { ApolloClient, InMemoryCache, DefaultOptions } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.bharatmock.com/api/graphql'
    : 'http://localhost:8000/api/graphql');

const uploadLink = new UploadHttpLink({
  uri: GRAPHQL_URL,
  fetchOptions: {
    credentials: 'include'
  }
});

const authLink = setContext((_, { headers }) => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token') || '';
  }
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'apollo-require-preflight': 'true'
    }
  };
});

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: 'cache-and-network'
  },
  query: {
    fetchPolicy: 'network-only'
  },
  mutate: {
    errorPolicy: 'all'
  }
};

export const apolloClient = new ApolloClient({
  link: authLink.concat(uploadLink),
  cache: new InMemoryCache(),
  defaultOptions
});
