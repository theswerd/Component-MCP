import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";

const VITE_DEV_URL = process.env.VITE_DEV_URL; // e.g. "http://localhost:5173"

export function createMcpServer() {
  const server = new McpServer({
    name: "compsplorer",
    version: "0.1.0",
  });

  const resourceUri = "ui://compsplorer/preview";

  registerAppResource(
    server,
    "Compsplorer Preview",
    resourceUri,
    {},
    async () => {
      let html: string;
      let meta: object | undefined;

      if (VITE_DEV_URL) {
        // Dev: load from Vite dev server (HMR enabled)
        html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body>
  <div id="root"></div>
  <script type="module" src="${VITE_DEV_URL}/@vite/client"></script>
  <script type="module">
    import RefreshRuntime from "${VITE_DEV_URL}/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>
  <script type="module" src="${VITE_DEV_URL}/src/mcp-app.tsx"></script>
</body>
</html>`;
        meta = {
          ui: {
            csp: {
              resourceDomains: [VITE_DEV_URL],
              connectDomains: [VITE_DEV_URL, VITE_DEV_URL.replace('http', 'ws')],
            },
          },
        };
      } else {
        // Prod: single-file build
        html = await fs.readFile(
          path.resolve(import.meta.dirname, "../../../preview/dist/mcp-app.html"),
          "utf-8",
        );
      }

      return {
        contents: [{
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          ...(meta ? { _meta: meta } : {}),
        }],
      };
    }
  );

  registerAppTool(
    server,
    "show_components",
    {
      title: "Component Explorer",
      description: "Show the Compsplorer component preview UI",
      inputSchema: {},
      _meta: { ui: { resourceUri } },
    },
    async () => ({
      content: [{ type: "text", text: "Compsplorer component preview" }],
    })
  );

  return server;
}
