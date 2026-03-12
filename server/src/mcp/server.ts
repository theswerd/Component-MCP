import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { createComponent, ensureSandbox } from "./create-component.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "Component MCP",
    version: "0.1.0",
  });

  const createdComponentResourceUri = "ui://componentmcp/created-component";

  registerAppTool(
    server,
    "create_component",
    {
      title: "Create Component",
      description: `Create or update a React component in the interactive preview sandbox. The preview renders the component with a controls panel that lets users switch between variants and tweak props in real time.

## How it works

You provide:
- \`name\`: The named export from your TSX code (e.g. "Button")
- \`component\`: TSX source that exports the component as a named export
- \`css\`: Optional CSS stylesheet (automatically imported)
- \`variants\`: Named presets — each variant is a set of props passed to the component
- \`argDefs\`: Defines the interactive controls shown in the controls panel

## Control types for argDefs

Each argDef maps a prop name to a control type:
- \`{ control: { type: "text" } }\` — text input for string props
- \`{ control: { type: "boolean" } }\` — checkbox for boolean props
- \`{ control: { type: "color" } }\` — color picker for color string props
- \`{ control: { type: "select", options: ["a", "b", "c"] } }\` — dropdown for enum props
- \`{ control: { type: "number", min: 0, max: 100, step: 1 } }\` — number input (min/max/step optional)

## Full example

name: "Button"

component:
\`\`\`tsx
import './component.css';

export interface ButtonProps {
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  backgroundColor?: string;
  label: string;
  onClick?: () => void;
}

export const Button = ({ primary = false, size = 'medium', backgroundColor, label, ...props }: ButtonProps) => (
  <button
    type="button"
    className={\`btn btn--\${size} \${primary ? 'btn--primary' : 'btn--secondary'}\`}
    style={{ backgroundColor }}
    {...props}
  >
    {label}
  </button>
);
\`\`\`

css:
\`\`\`css
.btn { display: inline-block; cursor: pointer; border: 0; border-radius: 3em; font-weight: 700; }
.btn--primary { color: white; background: #1ea7fd; }
.btn--secondary { color: #333; background: transparent; box-shadow: rgba(0,0,0,.15) 0 0 0 1px inset; }
.btn--small { font-size: 12px; padding: 10px 16px; }
.btn--medium { font-size: 14px; padding: 11px 20px; }
.btn--large { font-size: 16px; padding: 12px 24px; }
\`\`\`

variants:
{
  "Primary": { "label": "Click me", "primary": true, "size": "medium" },
  "Secondary": { "label": "Cancel", "primary": false, "size": "medium" },
  "Large": { "label": "Big button", "primary": true, "size": "large" },
  "Small": { "label": "Tiny", "primary": false, "size": "small" }
}

argDefs:
{
  "label": { "control": { "type": "text" }, "description": "Button text content" },
  "primary": { "control": { "type": "boolean" }, "description": "Use primary styling" },
  "size": { "control": { "type": "select", "options": ["small", "medium", "large"] }, "description": "Button size" },
  "backgroundColor": { "control": { "type": "color" }, "description": "Override background color" }
}`,
      inputSchema: {
        name: z.string().describe("The named export of the component from the TSX source (e.g. 'Button', 'Card', 'Avatar')"),
        component: z.string().describe("Complete TSX source code. Must have a named export matching `name`. Use `import './component.css'` if providing CSS. React is available globally — do not import it."),
        css: z.string().optional().describe("CSS source code for styling. Automatically imported via `import './component.css'` in the component source. Omit if the component uses only inline styles."),
        variants: z.record(z.string(), z.record(z.string(), z.unknown())).describe("Named prop presets. Each key is a variant name (e.g. 'Primary', 'Disabled'), each value is an object of props passed to the component. Every variant should provide all required props."),
        argDefs: z.record(z.string(), z.object({
          control: z.object({
            type: z.enum(["text", "boolean", "color", "select", "number"]).describe("Control widget type"),
            options: z.array(z.string()).optional().describe("Required for 'select' type — the dropdown options"),
            min: z.number().optional().describe("For 'number' type — minimum value"),
            max: z.number().optional().describe("For 'number' type — maximum value"),
            step: z.number().optional().describe("For 'number' type — step increment"),
          }),
          description: z.string().optional().describe("Human-readable description shown next to the control"),
        })).describe("Interactive controls for the preview panel. Each key is a prop name. Provide an argDef for every prop the user should be able to tweak."),
      },
      _meta: { ui: { resourceUri: createdComponentResourceUri } },
    },
    async ({ name, component, css, variants, argDefs }) => {
      const { domain } = await createComponent({ name, component, css, variants, argDefs });
      return {
        content: [
          { type: "text" as const, text: `Component "${name}" written to sandbox at https://${domain}` },
        ],
        _meta: { ui: { resourceUri: createdComponentResourceUri } },
      };
    }
  );

  registerAppResource(
    server,
    "Created Component Preview",
    createdComponentResourceUri,
    {},
    async () => {
      const { domain } = await ensureSandbox();

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
