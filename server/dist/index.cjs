"use strict";

// src/index.ts
var import_node_server = require("@hono/node-server");
var import_hono2 = require("hono");
var import_cors = require("hono/cors");
var import_webStandardStreamableHttp = require("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js");

// src/mcp/server.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_server = require("@modelcontextprotocol/ext-apps/server");
var import_zod = require("zod");

// src/mcp/create-component.ts
var import_freestyle_sandboxes2 = require("freestyle-sandboxes");
var import_with_dev_server = require("@freestyle-sh/with-dev-server");

// ../node_modules/@freestyle-sh/with-pty/dist/index.js
var import_freestyle_sandboxes = require("freestyle-sandboxes");
var DEFAULT_TMUX_CONF = `set -g mouse on
set -g status off`;
var VmPtySession = class extends import_freestyle_sandboxes.VmWith {
  options;
  constructor(options) {
    super();
    if (!/^[a-zA-Z0-9._-]+$/.test(options.sessionId)) {
      throw new Error(
        "Invalid PTY session id. Use only letters, numbers, dot, underscore, and hyphen."
      );
    }
    this.options = {
      sessionId: options.sessionId,
      resetSession: options.resetSession ?? true,
      cols: options.cols,
      rows: options.rows,
      envs: options.envs,
      installTmux: options.installTmux ?? true,
      workdir: options.workdir ?? "/root",
      applyDefaultTmuxConfig: options.applyDefaultTmuxConfig ?? true
    };
  }
  shellEscape(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
  validateEnvKey(key) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid env var name: ${key}`);
    }
  }
  configureSnapshotSpec(spec) {
    return this.applyToSpec(spec);
  }
  applyToSpec(spec) {
    const typedSpec = spec;
    if (!this.options.installTmux && !this.options.applyDefaultTmuxConfig) {
      return typedSpec;
    }
    return this.composeSpecs(
      typedSpec,
      new import_freestyle_sandboxes.VmSpec({
        aptDeps: this.options.installTmux ? ["tmux"] : void 0,
        additionalFiles: this.options.applyDefaultTmuxConfig ? {
          "/root/.tmux.conf": {
            content: DEFAULT_TMUX_CONF
          }
        } : void 0
      })
    );
  }
  createInstance() {
    return new VmPtySessionInstance(this);
  }
  attachCommand(readOnly = false) {
    const flag = readOnly ? "-r " : "";
    return `tmux attach ${flag}-t ${this.options.sessionId}`;
  }
  buildDetachedTmuxCommand(command, workdir) {
    const envPrefix = Object.entries(this.options.envs ?? {}).map(([key, value]) => {
      this.validateEnvKey(key);
      return `${key}=${this.shellEscape(value)}`;
    }).join(" ");
    const runCommand = `${envPrefix ? `${envPrefix} ` : ""}${command}`;
    return [
      "tmux new-session -d",
      `-s ${this.shellEscape(this.options.sessionId)}`,
      `-c ${this.shellEscape(workdir ?? this.options.workdir)}`,
      this.options.cols ? `-x ${this.options.cols}` : "",
      this.options.rows ? `-y ${this.options.rows}` : "",
      this.shellEscape(`bash -lc ${this.shellEscape(runCommand)}`)
    ].filter(Boolean).join(" ");
  }
  buildResetCommand() {
    return this.options.resetSession ? `tmux has-session -t ${this.shellEscape(this.options.sessionId)} >/dev/null 2>&1 && tmux kill-session -t ${this.shellEscape(this.options.sessionId)} || true` : "true";
  }
  wrapCommand(command, workdir) {
    const tmuxCommand = this.buildDetachedTmuxCommand(command, workdir);
    const resetCommand = this.buildResetCommand();
    return `bash -lc ${this.shellEscape(`set -e
${resetCommand}
${tmuxCommand}`)}`;
  }
  wrapServiceCommand(command, workdir) {
    const tmuxCommand = this.buildDetachedTmuxCommand(command, workdir);
    const resetCommand = this.buildResetCommand();
    return `bash -lc ${this.shellEscape(`set -e
${resetCommand}
${tmuxCommand}
while tmux has-session -t ${this.shellEscape(this.options.sessionId)} >/dev/null 2>&1; do
  sleep 1
done`)}`;
  }
  captureOutputCommand(options) {
    const lines = options?.lines ?? 200;
    const includeEscape = options?.includeEscape ?? true;
    return [
      "tmux capture-pane",
      includeEscape ? "-e" : "",
      "-p",
      `-t ${this.shellEscape(this.options.sessionId)}`,
      `-S -${lines}`
    ].filter(Boolean).join(" ");
  }
};
var VmPtySessionInstance = class extends import_freestyle_sandboxes.VmWithInstance {
  builder;
  constructor(builder) {
    super();
    this.builder = builder;
  }
  shellEscape(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
  async sendInput(data) {
    return this.vm.exec({
      command: `tmux set-buffer -- ${this.shellEscape(data)} && tmux paste-buffer -d -t ${this.shellEscape(this.builder.options.sessionId)}`
    });
  }
  async readOutput(options) {
    const lines = options?.lines ?? 200;
    const includeEscape = options?.includeEscape ?? true;
    const capture = [
      "tmux capture-pane",
      includeEscape ? "-e" : "",
      "-p",
      `-t ${this.shellEscape(this.builder.options.sessionId)}`,
      `-S -${lines}`
    ].filter(Boolean).join(" ");
    const result = await this.vm.exec({ command: capture });
    return result.stdout ?? "";
  }
  async kill() {
    await this.vm.exec({
      command: `tmux has-session -t ${this.shellEscape(this.builder.options.sessionId)} >/dev/null 2>&1 && tmux kill-session -t ${this.shellEscape(this.builder.options.sessionId)} || true`
    });
  }
};

// src/mcp/create-component.ts
var import_with_bun = require("@freestyle-sh/with-bun");
var import_unique_names_generator = require("unique-names-generator");
var TEMPLATE_REPO = "https://github.com/theswerd/Component-MCP";
var currentSandbox = null;
var createPromise = null;
async function createSandbox() {
  if (currentSandbox) return currentSandbox;
  if (createPromise) return createPromise;
  createPromise = (async () => {
    const { repoId } = await import_freestyle_sandboxes2.freestyle.git.repos.create({
      import: {
        type: "git",
        url: TEMPLATE_REPO,
        commitMessage: "Initial commit from Component MCP"
      }
    });
    const devPty = new VmPtySession({ sessionId: "dev-server" });
    const domain = `${(0, import_unique_names_generator.uniqueNamesGenerator)({
      dictionaries: [
        import_unique_names_generator.adjectives,
        import_unique_names_generator.animals,
        import_unique_names_generator.names,
        import_unique_names_generator.starWars,
        import_unique_names_generator.NumberDictionary.generate({ min: 100, max: 999 })
      ],
      length: 3,
      separator: "-",
      style: "lowerCase"
    })}-prev.style.dev`;
    const { vm } = await import_freestyle_sandboxes2.freestyle.vms.create({
      recreate: true,
      spec: new import_freestyle_sandboxes2.VmSpec({
        snapshot: new import_freestyle_sandboxes2.VmSpec({
          with: {
            node: new import_with_bun.VmBun({
              deleteAfterSuccess: false
            }),
            devPty,
            devServer: new import_with_dev_server.VmDevServer({
              workdir: "/repo",
              runtime: new import_with_bun.VmBun(),
              installCommand: "bun install",
              port: 5173,
              templateRepo: TEMPLATE_REPO,
              devCommand: "bun run dev:preview -- --host",
              devCommandPty: devPty,
              env: {
                PATH: "/opt/bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                BUN_INSTALL: "/opt/bun"
              }
            })
          }
        }),
        with: {
          devServer: new import_with_dev_server.VmDevServer({
            repo: repoId
          })
        }
      }),
      domains: [
        {
          domain,
          vmPort: 5173
        }
      ]
    });
    currentSandbox = { domain, vm };
    return currentSandbox;
  })();
  try {
    return await createPromise;
  } finally {
    createPromise = null;
  }
}
async function writeComponentFiles({
  name,
  component,
  css,
  variants,
  argDefs
}) {
  const { vm, domain } = await createSandbox();
  const componentSource = css ? `import './component.css';
${component}` : component;
  await vm.fs.writeTextFile("/repo/preview/src/stories/component.tsx", componentSource);
  if (css) {
    await vm.fs.writeTextFile("/repo/preview/src/stories/component.css", css);
  }
  const entrySource = `import { ${name} } from "./component";
import type { ArgDef, ComponentDef } from "../controls";

const componentArgDefs: Record<string, ArgDef> = ${JSON.stringify(argDefs, null, 2)};

const componentDef: ComponentDef = {
  component: ${name},
  variants: ${JSON.stringify(variants, null, 2)},
  args: componentArgDefs,
};

export default componentDef;
`;
  await vm.fs.writeTextFile("/repo/preview/src/stories/component-entry.ts", entrySource);
  return { domain };
}

// src/mcp/server.ts
function createMcpServer() {
  const server = new import_mcp.McpServer({
    name: "Component MCP",
    version: "0.1.0"
  });
  const createdComponentResourceUri = "ui://componentmcp/created-component";
  (0, import_server.registerAppTool)(
    server,
    "show_components",
    {
      title: " Component Explorer",
      description: "Show the Composer component preview UI",
      inputSchema: {},
      _meta: { ui: { resourceUri: createdComponentResourceUri } }
    },
    async () => ({
      content: [{ type: "text", text: "component preview" }]
    })
  );
  server.tool(
    "create_component",
    "Create or update a component in the preview sandbox",
    {
      name: import_zod.z.string().describe("Component export name (e.g. 'Button')"),
      component: import_zod.z.string().describe("TSX source code for the component"),
      css: import_zod.z.string().optional().describe("Optional CSS source code"),
      variants: import_zod.z.record(import_zod.z.string(), import_zod.z.record(import_zod.z.string(), import_zod.z.unknown())).describe("Variant definitions, e.g. { Primary: { label: 'Click me', primary: true } }"),
      argDefs: import_zod.z.record(import_zod.z.string(), import_zod.z.object({
        control: import_zod.z.object({
          type: import_zod.z.string(),
          options: import_zod.z.array(import_zod.z.string()).optional(),
          min: import_zod.z.number().optional(),
          max: import_zod.z.number().optional(),
          step: import_zod.z.number().optional()
        }),
        description: import_zod.z.string().optional()
      })).describe("Arg definitions for controls")
    },
    async ({ name, component, css, variants, argDefs }) => {
      const { domain } = await writeComponentFiles({ name, component, css, variants, argDefs });
      return {
        content: [
          { type: "text", text: `Component "${name}" written to sandbox at https://${domain}` }
        ],
        _meta: { ui: { resourceUri: createdComponentResourceUri } }
      };
    }
  );
  (0, import_server.registerAppResource)(
    server,
    "Created Component Preview",
    createdComponentResourceUri,
    {},
    async () => {
      const { domain } = await createSandbox();
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
          mimeType: import_server.RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                frameDomains: [`https://${domain}`]
              }
            }
          }
        }]
      };
    }
  );
  return server;
}

// src/routes/api.ts
var import_hono = require("hono");
var api = new import_hono.Hono();
api.get("/health", (c) => c.json({ status: "ok" }));
api.get("/hello/:name", (c) => {
  const name = c.req.param("name");
  return c.json({ message: `Hello, ${name}!` });
});

// src/index.ts
if (!process.env.FREESTYLE_API_KEY) {
  console.error("FREESTYLE_API_KEY is required. Set it in your environment or .env file.");
  process.exit(1);
}
var app = new import_hono2.Hono();
app.use(
  "*",
  (0, import_cors.cors)({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "mcp-session-id",
      "Last-Event-ID",
      "mcp-protocol-version"
    ],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"]
  })
);
app.route("/api", api);
app.all("/mcp", async (c) => {
  const transport = new import_webStandardStreamableHttp.WebStandardStreamableHTTPServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});
var port = 5642;
console.log(`Server running on http://localhost:${port}`);
(0, import_node_server.serve)({ fetch: app.fetch, port });
