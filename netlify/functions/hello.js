const headers = require("../../headers");

exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "Hello World" }),
  };
};
