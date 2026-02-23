"use client";

import { useEffect, useMemo, useState } from "react";
import { gql } from "@/app/lib/graphqlClient";

type Todo = {
  id: string;
  userId: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

const Q_TODOS = /* GraphQL */ `
  query Todos {
    todos {
      id
      userId
      title
      done
      createdAt
      updatedAt
    }
  }
`;

const M_ADD = /* GraphQL */ `
  mutation AddTodo($title: String!) {
    addTodo(title: $title) {
      id
      userId
      title
      done
      createdAt
      updatedAt
    }
  }
`;

const M_TOGGLE = /* GraphQL */ `
  mutation ToggleTodo($id: ID!) {
    toggleTodo(id: $id) {
      id
      userId
      title
      done
      createdAt
      updatedAt
    }
  }
`;

const M_DELETE = /* GraphQL */ `
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`;

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTodos = useMemo(() => {
    // createdAt string ISO гэвэл энэ sort OK
    return [...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [todos]);

  const loadTodos = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await gql<{ todos: Todo[] }>(Q_TODOS);
      setTodos(data.todos);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load todos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Please enter a title");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await gql<{ addTodo: Todo }>(M_ADD, { title: trimmed });

      // optimistic: list дахин дуудахын оронд шууд нэмнэ
      setTodos((prev) => [data.addTodo, ...prev]);
      setTitle("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to add todo");
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: string) => {
    setError(null);
    // UI-г түр “optimistic” өөрчилж болно
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );

    try {
      const data = await gql<{ toggleTodo: Todo }>(M_TOGGLE, { id });
      // server дээрх бодит утгаар sync
      setTodos((prev) => prev.map((t) => (t.id === id ? data.toggleTodo : t)));
    } catch (e: any) {
      // rollback
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      );
      setError(e?.message ?? "Failed to toggle todo");
    }
  };

  const deleteTodo = async (id: string) => {
    setError(null);

    // optimistic remove
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const data = await gql<{ deleteTodo: boolean }>(M_DELETE, { id });
      if (!data.deleteTodo) {
        // server delete амжилтгүй бол буцаана
        setTodos(snapshot);
        setError("Delete failed");
      }
    } catch (e: any) {
      setTodos(snapshot);
      setError(e?.message ?? "Failed to delete todo");
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") addTodo();
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Todos</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a todo..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={addTodo}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Add
        </button>
        <button
          onClick={loadTodos}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #f3c6c6",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {loading && todos.length === 0 ? (
          <p>Loading...</p>
        ) : sortedTodos.length === 0 ? (
          <p>No todos yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {sortedTodos.map((t) => (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 10px",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t.id)}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        textDecoration: t.done ? "line-through" : "none",
                        opacity: t.done ? 0.65 : 1,
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => toggleTodo(t.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                  >
                    Toggle
                  </button>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
