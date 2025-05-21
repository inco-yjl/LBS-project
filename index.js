const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

// data
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com', password: '123456' },
  { id: '2', name: 'Bob', email: 'bob@example.com', password: 'password' },
  { id: '3', name: 'u3', email: 'u3@example.com', password: 'password' },
  { id: '4', name: 'u4', email: 'u4@example.com', password: 'password' },
  { id: '5', name: 'u5', email: 'u5@example.com', password: 'password' },
  { id: '6', name: 'u6', email: 'u6@example.com', password: 'password' },
  { id: '7', name: 'u7', email: 'u7@example.com', password: 'password' },
  { id: '8', name: 'u8', email: 'u8@example.com', password: 'password' },
  { id: '9', name: 'u9', email: 'u9@example.com', password: 'password' },
];

users.forEach(user => {
  user.friends = users.filter(u => u.id !== user.id);
});

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    password: String!  # vulnerability
    friends: [User]
  }

  type Query {
    users: [User]
    user(id: ID!): User
    systemUpdate: String
  }

  type Mutation {
    registerUser(id: ID!, name: String!, email: String!, password: String!): User
  }
`;

// Resolvers
const resolvers = {
  Query: {
    users: () => users,
    user: (_, { id }) => users.find(user => user.id === id),
    systemUpdate: () => {
      const start = Date.now();
      while (Date.now() - start < 5000) {
        // blocking...
      }
      return `Update completed.`;
    },
  },
};

// build Apollo GraphQL Server
async function startServer() {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // introspection is enabled by default,
    // disable: introspection: false,
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server running at http://localhost:4000/graphql`);
  });
}

startServer();
