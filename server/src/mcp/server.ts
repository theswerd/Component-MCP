import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { createComponent } from "./create-component.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "compsplorer",
    version: "0.1.0",
  });

  const createdComponentResourceUri = "ui://componentmcp/created-component";

  registerAppTool(
    server,
    "show_components",
    {
      title: "Component Explorer",
      description: "Show the Compsplorer component preview UI",
      inputSchema: {},
      _meta: { ui: { resourceUri: createdComponentResourceUri } },
    },
    async () => ({
      content: [{ type: "text", text: "Compsplorer component preview" }],
    })
  );

  registerAppResource(
    server,
    "Created Component Preview",
    createdComponentResourceUri,
    {},
    async () => {
      const { domain } = await createComponent();
      const src = `https://${domain}/mcp-app.html`;
      const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><style>*{margin:0;padding:0}html,body,iframe{width:100%;height:100%;border:none;}</style></head>
<body>
<iframe src="${src}" allow="clipboard-read; clipboard-write"></iframe>
<script>
  const iframe = document.querySelector('iframe');
  window.addEventListener('message', (e) => {
    if (e.source === iframe.contentWindow) {
      window.parent.postMessage(e.data, '*');
    } else if (e.source === window.parent) {
      iframe.contentWindow.postMessage(e.data, '*');
    }
  });
</script>
</body>
</html>`;

      return {
        contents: [{
          uri: createdComponentResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                frameDomains: [`https://${domain}`],
              },
            },
          },
        }],
      };
    }
  );

  return server;
}
