const Incenerate = require("../index.js");

async function main() {
  const incenerate = new Incenerate({
    "host": "ws://localhost:8081",
    "password": "test"
  });

  incenerate.on("connection", (ws) => {
    ws.send("Hello World");

    ws.on("message", (data) => {
      ws.send(data);
    });
  });
}

main();