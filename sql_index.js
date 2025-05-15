const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { applyMiddleware } = require("graphql-middleware");
const { shield, rule, and, or } = require("graphql-shield");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

const isAdmin = rule()(async (parent, args, ctx, info) => {
  return ctx.user?.role === "admin";
});
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT)");
  db.run("INSERT INTO users (name, role) VALUES ('Clina', 'user')");
  db.run("INSERT INTO users (name, role) VALUES ('lu', 'admin')");
  db.run("INSERT INTO users (name, role) VALUES ('lu', 'user')");
});

function getUserFromToken(token) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [token], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
  }

  type Query {
    users: [User]
    user(id: ID!): User
    searchUser(name: String!): [User]
  }
`;

const permissions = shield({
  Query: {
    users: isAdmin,
  },
});
// Resolvers 实现
const resolvers = {
  Query: {
    users: () =>
      new Promise((resolve, reject) => {
        db.all("SELECT id, name FROM users", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
    user: (_, { id }) =>
      new Promise((resolve, reject) => {
        const sql = `SELECT id, name FROM users WHERE id = ${id}`;
        db.get(sql, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
    searchUser: (_, { name }) =>
      new Promise((resolve, reject) => {
        /*
        const sql = `SELECT id, name FROM users WHERE name = ${name}`;
        db.all(sql, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });*/

        db.all("SELECT id, name FROM users WHERE name = ?", [name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
  },
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
    context: async ({ req }) => {
      const token = req.headers.authorization || "";
      const user = await getUserFromToken(token);
      return { user };
    },
    formatError: (error) => {
      console.error("GraphQL Error:", error.extensions);

      return {
        code: error.extensions?.code || "INTERNAL_ERROR",
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(80, () => {
    console.log(`Server running at http://localhost:80/graphql`);
  });
}

startServer();
