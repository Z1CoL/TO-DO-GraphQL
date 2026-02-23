// src/lib/graphqlClient.ts
export type GraphQLErrorItem = {
  message: string;
  extensions?: { code?: string };
};

export async function gql<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const json: { data?: TData; errors?: GraphQLErrorItem[] } = await res.json();

  if (!res.ok) {
    // HTTP level error (rare for GraphQL, but just in case)
    throw new Error(`Request failed: ${res.status}`);
  }

  if (json.errors?.length) {
    const first = json.errors[0];
    const code = first.extensions?.code ? ` (${first.extensions.code})` : "";
    throw new Error(first.message + code);
  }

  if (!json.data) {
    throw new Error("No data returned from GraphQL");
  }

  return json.data;
}
