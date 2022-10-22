import getConfig from "next/config";

const { gauzy_api_server_url } = getConfig().serverRuntimeConfig;

export function serverFetch<T>(
  path: string,
  method: "POST" | "GET" | "PUT" | "DELETE",
  body: any,
  bearer_token?: string,
  init?: RequestInit
) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (bearer_token) {
    headers["authorization"] = `Bearer ${bearer_token}`;
  }

  return fetch(gauzy_api_server_url + path, {
    body: JSON.stringify(body),
    ...(init || {}),
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
    method,
  }).then(async (res) => {
    return {
      data: (await res.json().catch(console.error)) as T,
      response: res,
    };
  });
}
