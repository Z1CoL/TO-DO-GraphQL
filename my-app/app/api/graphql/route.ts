import { createYoga, createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { db } from "@/app/db";
import { todos } from "@/app/db/schema";
import { desc, eq } from "drizzle-orm";

function mapTodo(row: any) {
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}

function getUserId() {
  return "user-1";
}

const yoga = createYoga({
  graphqlEndpoint: "/api/graphql",
  schema: createSchema({
    typeDefs: `
      type Todo {
        id: ID!
        userId: String!
        title: String!
        done: Boolean!
        createdAt: String!
        updatedAt: String!
      }

      type Query {
        todos: [Todo!]!
      }

      type Mutation {
        addTodo(title: String!): Todo!
        toggleTodo(id: ID!): Todo!
        deleteTodo(id: ID!): Boolean!
      }
    `,
    resolvers: {
      Query: {
        todos: async () => {
          const userId = getUserId();

          const rows = await db
            .select()
            .from(todos)
            .where(eq(todos.userId, userId))
            .orderBy(desc(todos.createdAt));

          return rows.map(mapTodo);
        },
      },

      Mutation: {
        addTodo: async (_: unknown, args: { title: string }) => {
          const userId = getUserId();
          const title = String(args.title ?? "").trim();

          if (!title) {
            throw new GraphQLError("title is required", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }

          const created = await db
            .insert(todos)
            .values({ userId, title })
            .returning();

          if (!created[0]) {
            throw new GraphQLError("Failed to create todo", {
              extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
          }

          return mapTodo(created[0]);
        },

        toggleTodo: async (_: unknown, args: { id: string }) => {
          const userId = getUserId();

          // 1) read
          const found = await db
            .select()
            .from(todos)
            .where(eq(todos.id, args.id))
            .limit(1);

          const todo = found[0];

          if (!todo) {
            throw new GraphQLError("Todo not found", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          if (todo.userId !== userId) {
            throw new GraphQLError("Forbidden", {
              extensions: { code: "FORBIDDEN" },
            });
          }

          // 2) update
          const updated = await db
            .update(todos)
            .set({ done: !todo.done })
            .where(eq(todos.id, args.id))
            .returning();

          if (!updated[0]) {
            throw new GraphQLError("Failed to update todo", {
              extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
          }

          return mapTodo(updated[0]);
        },

        deleteTodo: async (_: unknown, args: { id: string }) => {
          const userId = getUserId();

          const found = await db
            .select()
            .from(todos)
            .where(eq(todos.id, args.id))
            .limit(1);

          const todo = found[0];

          if (!todo) {
            throw new GraphQLError("Todo not found", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          if (todo.userId !== userId) {
            throw new GraphQLError("Forbidden", {
              extensions: { code: "FORBIDDEN" },
            });
          }

          const deleted = await db
            .delete(todos)
            .where(eq(todos.id, args.id))
            .returning();

          return deleted.length > 0;
        },
      },
    },
  }),
});

export const GET = yoga.handleRequest;
export const POST = yoga.handleRequest;
