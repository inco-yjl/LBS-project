const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

// 模拟数据库中的用户数据
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com', password: '123456' },
  { id: '2', name: 'Bob', email: 'bob@example.com', password: 'password' },
];

// GraphQL Schema（含 password 字段，故意暴露）
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    password: String!  # 漏洞：不应暴露密码字段
  }

  type Query {
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    registerUser(id: ID!, name: String!, email: String!, password: String!): User
  }
`;

// Resolvers 实现
const resolvers = {
  Query: {
    users: () => users,
    user: (_, { id }) => users.find(user => user.id === id),
  },
};

// 构建 Apollo GraphQL Server
async function startServer() {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // introspection 默认开启，适合做攻击实验
    // 如果要禁用，设置为 false: introspection: false,
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server running at http://localhost:4000/graphql`);
  });
}

startServer();
