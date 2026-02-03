import { ApolloClient, InMemoryCache, createHttpLink, DefaultOptions } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/api/graphql';

const httpLink = createHttpLink({
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
      ...(token && { Authorization: `Bearer ${token}` })
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
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions
});
