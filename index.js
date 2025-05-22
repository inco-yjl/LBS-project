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


const users = [
  { id: 'Clina123', name: 'Clina', email: 'cl@example.com', password: '123456', role: 'user' },
  { id: 'lu_6678', name: 'lu', email: 'lu@example.com', password: 'password', role: 'admin' },
];
function getUserFromToken(token) {
  return users.find(u => u.id === token) || null;
}


const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
  }

  type Query {
    users: [User]
    user(id: ID!): User
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
