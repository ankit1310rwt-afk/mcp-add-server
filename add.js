import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "http";

const USER_AGENT = "add/1.0";

// Create server instance
const server = new McpServer({
  name: "add",
  version: "1.0.0",
});

server.registerTool(
  "add_numbers",
  {
    description: "Add two numbers",
    inputSchema: z.object({
      a: z.number().describe("First number to add"),
      b: z.number().describe("Second number to add"),
    }),
  },
  async ({ a, b }) => {
    const result = a + b;
    return {
      content: [
        {
          type: "text",
          text: `The sum of ${a} and ${b} is ${result}.`,
        },
      ],
    };
  },
);


server.registerTool(
  "multiple_numbers",
  {
    description: "Multiple two numbers",
    inputSchema: z.object({
        a: z.number().describe("First number to multiply"),
        b: z.number().describe("Second number to multiply"),
    }),
  },
  async({a,b})=>{
    const result = a * b;
    return {
        content:[
            {
                type:"text",
                text: `The product of ${a} and ${b} is ${result}.` 
            }
        ]
    }
  }
)

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

const httpServer = createServer((req, res) => transport.handleRequest(req, res));

server.connect(transport).then(() => {
  httpServer.listen(8080, () => console.log("MCP server running on port 8080"));
});


