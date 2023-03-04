//import headers from "../../headers";

export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Hello World" }),
  };
}
