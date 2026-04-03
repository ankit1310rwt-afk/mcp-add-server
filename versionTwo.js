import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createServer } from "http";
import pdf from 'pdf-creator-node';
import puppeteer from 'puppeteer';


const sessions = new Map();

function createMcpServer() {
 
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
// server.registerTool(
//   "htmlToPDF",
//   {
//     "description": "Convert HTML content to PDF format",
//     "inputSchema": z.object({
//       html: z.string().describe("The HTML content to convert"),
//     }),
//   },
//  async({html})=>{
//   const generatePdfFromHtml = async (html) => {
//   const browser = await puppeteer.launch({ 
//     args: ['--no-sandbox', '--disable-setuid-sandbox'] 
//   });
//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: 'networkidle0' });
//   const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
//   await browser.close();
//   return pdfBuffer;
// };
//   const buffer=await generatePdfFromHtml(html);
//   return {
//     content: [
//       {
//         type: "text",
//         fileName: "converted.pdf",
//         mimeType: "application/pdf",
//         text: buffer?.toString("base64")|| buffer,
//       },
//     ],
//   };
// }


// )
server.registerTool(
  "htmlToPDF",
  {
    "description": "Convert HTML content to PDF format and return downloadable PDF",
    "inputSchema": z.object({
      html: z.string().describe("The HTML content to convert"),
      filename: z.string().optional().describe("Output filename (default: converted.pdf)"),
      format: z.enum(["A4", "Letter", "A3", "A5"]).optional().describe("Paper format"),
      landscape: z.boolean().optional().describe("Landscape orientation (default: false)"),
    }),
  },
  async ({ html, filename = "converted.pdf", format = "A4", landscape = false }) => {
    try {
      const generatePdfFromHtml = async (html) => {
        const browser = await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          headless: "new", // Use new headless mode
        });

        try {
          const page = await browser.newPage();
          
          // Set viewport for consistent rendering
          await page.setViewport({ width: 1280, height: 720 });
          
          // Set content with network idle wait
          await page.setContent(html, { waitUntil: "networkidle0" });
          
          // Generate PDF with proper options
          const pdfBuffer = await page.pdf({
            format: format,
            landscape: landscape,
            printBackground: true,
            margin: {
              top: "20px",
              bottom: "20px",
              left: "20px",
              right: "20px",
            },
          });

          await page.close();
          return pdfBuffer;
        } finally {
          await browser.close();
        }
      };

      // Generate PDF
      const pdfBuffer = await generatePdfFromHtml(html);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("PDF generation produced empty buffer");
      }

      // Return in proper MCP document format
      return {
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: ` PDF generated successfully: ${filename} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error generating PDF: ${error.message}`,
          },
        ],
      };
    }
  }
);


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