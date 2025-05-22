const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { applyMiddleware } = require('graphql-middleware');
const { shield, rule, and, or, allow } = require('graphql-shield');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const isAdmin = rule()(async (parent, args, ctx, info) => {
  return ctx.user?.role === 'admin'
})
const isOwner = rule()(async (parent, args, ctx, info) => {
  return ctx.user?.items.some((id) => id === parent.id)
})

// data
const users = [
  { id: 'Clina123', name: 'Clina', email: 'cl@example.com', password: '123456', role: 'user' },
  { id: 'lu_6678', name: 'lu', email: 'lu@example.com', password: 'password', role: 'admin' },
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
function getUserFromToken(token) {
  return users.find(u => u.id === token) || null;
}


users.forEach(user => {
  user.friends = users.filter(u => u.id !== user.id);
});

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
    friends: [User]
  }

  type Query {
    users: [User]
    user(id: ID!): User
    systemUpdate: String
  }

  type Mutation {
    addUser(id: ID!, name: String!, email: String!, password: String!): User
    deleteUser(id: ID!): Boolean!
  }
`;
 
const permissions = shield({
  Query: {
    user: allow,
    users: isAdmin
  },
  Mutation: {
    deleteUser: isAdmin
  },
  User: {
    password: isOwner,
  },
})

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
  Mutation: {
    addUser: (_, { id, name, email, password }) => {
      const newUser = { id, name, email, password };
      users.push(newUser);
      return newUser;
    },
    deleteUser: (_, { id }) => {
      if (!id) return false;
      const index = users.findIndex(user => user.id === id);
      if (index === -1) return false;
      users.splice(index, 1);
      return true;
    }
  }
};
const rawSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const schema = applyMiddleware(rawSchema, permissions);

async function startServer() {
  const app = express();
  const server = new ApolloServer({
    schema,
    typeDefs,
    resolvers,
    introspection: false,
    context: ({ req }) => {
      const token = req.headers.authorization || '';
      const user = getUserFromToken(token);
      return { user };
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error.extensions);
      
      return {
        code: error.extensions?.code || 'INTERNAL_ERROR'
      };
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server running at http://localhost:4000/graphql`);
  });
}

startServer();
