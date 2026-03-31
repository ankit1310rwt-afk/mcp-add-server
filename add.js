import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createServer } from "http";

const server = new McpServer({ name: "add", version: "1.0.0" });

server.registerTool(
  "add_numbers",
  {
    description: "Add two numbers",
    inputSchema: z.object({
      a: z.number().describe("First number to add"),
      b: z.number().describe("Second number to add"),
    }),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `The sum of ${a} and ${b} is ${a + b}.` }],
  })
);

server.registerTool(
  //name
  "multiple_numbers",
  {
    description: "Multiply two numbers",
    // arguments
    inputSchema: z.object({
      a: z.number().describe("First number to multiply"),
      b: z.number().describe("Second number to multiply"),
    }),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `The product of ${a} and ${b} is ${a * b}.` }],
  })
);

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});


const httpServer = createServer((req, res) => {
  if (req.url === "/mcp") {
    if (req.method === "POST") {
      transport.handleRequest(req, res);
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

server.connect(transport).then(() => {
  const PORT = process.env.PORT || 8080; 
  httpServer.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));
});
