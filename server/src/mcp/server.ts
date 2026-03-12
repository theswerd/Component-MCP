import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";
import { createComponent } from "./create-component.js";

const VITE_DEV_URL = process.env.VITE_DEV_URL; // e.g. "http://localhost:5173"

let createdComponentDomain: string | null = null;

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
      let meta: Record<string, unknown> | undefined;

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

  // registerAppTool(
  //   server,
  //   "show_components",
  //   {
  //     title: "Component Explorer",
  //     description: "Show the Compsplorer component preview UI",
  //     inputSchema: {},
  //     _meta: { ui: { resourceUri } },
  //   },
  //   async () => ({
  //     content: [{ type: "text", text: "Compsplorer component preview" }],
  //   })
  // );

  const createdComponentResourceUri = "ui://componentmcp/created-component";

  registerAppResource(
    server,
    "Created Component Preview",
    createdComponentResourceUri,
    {},
    async () => {
      let html: string;
      let meta: Record<string, unknown> | undefined;

      if (createdComponentDomain) {
        const src = `https://${createdComponentDomain}/mcp-app.html`;
        html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><style>*{margin:0;padding:0}html,body,iframe{width:100%;height:100%;border:none;}</style></head>
<body><iframe src="${src}" allow="clipboard-read; clipboard-write"></iframe></body>
</html>`;
        meta = {
          ui: {
            csp: {
              frameDomains: [`https://${createdComponentDomain}`],
            },
          },
        };
      } else {
        html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body><p>No component created yet.</p></body>
</html>`;
      }

      return {
        contents: [{
          uri: createdComponentResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          ...(meta ? { _meta: meta } : {}),
        }],
      };
    }
  );

  registerAppTool(
    server,
    "create_component",
    {
      title: "Component Preview",
      description: "Create a new component",
      inputSchema: {},
      _meta: { ui: { resourceUri: createdComponentResourceUri } },
    },
    async () => {
      const result = await createComponent();
      createdComponentDomain = result.domain;
      return { content: result.content };
    }
  );

  return server;
}
