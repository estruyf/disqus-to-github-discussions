import fetch from "node-fetch";

export const getRateLimit = async (token: string) => {

  const response = await fetch("https://api.github.com/rate_limit", {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    }
  }).then((r) => r.json());

  console.log(JSON.stringify(response, null, 2));

  return;
}