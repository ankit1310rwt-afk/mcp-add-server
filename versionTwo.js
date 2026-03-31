import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createServer } from "http";

// ✅ Store sessions: sessionId → { server, transport }
const sessions = new Map();

function createMcpServer() {
  // ✅ Create a FRESH McpServer instance per session
  const server = new McpServer({ name: "add", version: "1.0.0" });

  server.registerTool("greet", {
    description: "Greet me whenever i greet to you",
  }, async () => ({
    content: [{ type: "text", text: "hi sir how are u" }],
  }));

  server.registerTool("add_numbers", {
    description: "Add two numbers",
    inputSchema: z.object({
      a: z.number().describe("First number to add"),
      b: z.number().describe("Second number to add"),
    }),
  }, async ({ a, b }) => ({
    content: [{ type: "text", text: `The sum of ${a} and ${b} is ${a + b}.` }],
  }));

  server.registerTool("multiple_numbers", {
    description: "Multiply two numbers",
    inputSchema: z.object({
      a: z.number().describe("First number to multiply"),
      b: z.number().describe("Second number to multiply"),
    }),
  }, async ({ a, b }) => ({
    content: [{ type: "text", text: `The product of ${a} and ${b} is ${a * b}.` }],
  }));

  return server;
}

const httpServer = createServer(async (req, res) => {
  if (req.url === "/mcp") {
    if (req.method === "POST") {
      const sessionId = req.headers["mcp-session-id"];

      let transport;

      if (sessionId && sessions.has(sessionId)) {
        // ✅ Reuse existing session transport
        transport = sessions.get(sessionId).transport;
      } else {
        // ✅ New session: create fresh server + transport instances
        const server = createMcpServer();

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            // ✅ Save session once ID is assigned
            sessions.set(id, { server, transport });
            console.log(`New session: ${id}`);
          },
        });

        // ✅ Connect once per server+transport pair
        await server.connect(transport);
      }

      await transport.handleRequest(req, res);

    } else if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ name: "add", version: "1.0.0" }));
    } else {
      res.writeHead(405).end("Method not allowed");
    }
  } else {
    res.writeHead(404).end("Not found");
  }
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));