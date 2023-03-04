import headers from "../../headers";

export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify({ message: "Hello World" }),
  };
}
