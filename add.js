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
  "multiple_numbers",
  {
    description: "Multiply two numbers",
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
  if (req.url === "/mcp" && req.method === "POST") {
    transport.handleRequest(req, res);
  } else {
    res.writeHead(404).end("Not found");
  }
});

server.connect(transport).then(() => {
  const PORT = process.env.PORT || 8080; 
  httpServer.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));
});
