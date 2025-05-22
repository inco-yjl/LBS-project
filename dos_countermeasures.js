const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const rateLimit = require('express-rate-limit');
const depthLimit = require('graphql-depth-limit');
const {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
} = require('graphql-query-complexity');
const { makeExecutableSchema } = require('@graphql-tools/schema');

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

// Query Width Limiting
function operationLimitsRule(context) {
  let totalFields = 0;
  let rootFields = 0;
  let aliasCount = 0;

  return {
    OperationDefinition(node) {
      rootFields = node.selectionSet.selections.length;
    },
    Field(node) {
      totalFields++;
      if (node.alias) aliasCount++;
    },
    Document: {
      leave() {
        const MAX_TOTAL_FIELDS = 50;
        const MAX_ROOT_FIELDS = 10;
        const MAX_ALIASES = 5;

        if (totalFields > MAX_TOTAL_FIELDS) {
          context.reportError(
              new Error(`Query has too many fields: ${totalFields}.`)
          );
        }
        if (rootFields > MAX_ROOT_FIELDS) {
          context.reportError(
              new Error(`Query has too many root fields: ${rootFields}.`)
          );
        }
        if (aliasCount > MAX_ALIASES) {
          context.reportError(
              new Error(`Query has too many aliases: ${aliasCount}.`)
          );
        }
      }
    }
  };
}

// Sensitive Field Limit
function sensitiveFieldLimitRule(context) {
  const sensitiveFields = new Set(['password']);
  let sensitiveFieldCount = 0;

  return {
    Field(node) {
      if (sensitiveFields.has(node.name.value)) {
        sensitiveFieldCount++;
      }
    },
    Document: {
      leave() {
        const MAX_SENSITIVE_FIELDS = 2;
        if (sensitiveFieldCount > MAX_SENSITIVE_FIELDS) {
          context.reportError(
              new Error(`Query contains too many sensitive fields: ${sensitiveFieldCount}.`)
          );
        }
      }
    }
  };
}

// Custom complexity
const complexityByField = {
  friends: 5,
  users: 2,
  systemUpdate: 20,
};

const customEstimator = ({ field }) => {
  if (!field) return null;
  const complexity = complexityByField[field.name];
  return complexity || null;
};

// build Apollo GraphQL Server
async function startServer() {
  const app = express();

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/graphql', limiter);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const server = new ApolloServer({
    schema,
    // introspection is enabled by default,
    // disable: introspection: false,
    validationRules: [
      depthLimit(5),  // Query Depth Limiting
      operationLimitsRule,      // Query Width Limiting
      sensitiveFieldLimitRule
    ],
    // Query Complexity Analysis
    plugins: [
      {
        // calculate complexity before execution
        async requestDidStart() {
          return {
             async didResolveOperation({ request, document }) {
              const complexity = getComplexity({
                schema,
                operationName: request.operationName,
                query: document,
                variables: request.variables,
                estimators: [
                  // custom complexity
                  customEstimator,
                  // fieldExtensionsEstimator(),
                  simpleEstimator({ defaultComplexity: 1 }),
                ],
              });

              const MAX_COMPLEXITY = 50;
              if (complexity > MAX_COMPLEXITY) {
                throw new Error(
                    `Query complexity is too high: ${complexity}.`
                );
              }
              // console.log('Query Complexity:', complexity);
            },
          };
        },
      },
    ],

  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server running at http://localhost:4000/graphql`);
  });
}

startServer();
