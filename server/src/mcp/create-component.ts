import { freestyle, Vm, VmSpec } from "freestyle-sandboxes";
import { VmDevServer } from "@freestyle-sh/with-dev-server";
import { VmPtySession } from "@freestyle-sh/with-pty";
import { VmBun } from "@freestyle-sh/with-bun";
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
  names,
  starWars,
  NumberDictionary,
} from "unique-names-generator";

const TEMPLATE_REPO = "https://github.com/theswerd/Component-MCP";

let currentSandbox: { domain: string; vm: Vm } | null = null;
let createPromise: Promise<{ domain: string; vm: Vm }> | null = null;

export async function ensureSandbox(): Promise<{ domain: string; vm: Vm }> {
  if (currentSandbox) return currentSandbox;
  if (createPromise) return createPromise;

  createPromise = (async () => {
    const { repoId } = await freestyle.git.repos.create({
      import: {
        type: "git",
        url: TEMPLATE_REPO,
        commitMessage: "Initial commit from Component MCP",
      },
    });
    const devPty = new VmPtySession({ sessionId: "dev-server" });
    const domain = `${uniqueNamesGenerator({
      dictionaries: [
        adjectives,
        animals,
        names,
        starWars,
        NumberDictionary.generate({ min: 100, max: 999 }),
      ],
      length: 3,
      separator: "-",
      style: "lowerCase",
    })}-prev.style.dev`;

    const { vm } = await freestyle.vms.create({
      recreate: true,
      spec: new VmSpec({
        snapshot: new VmSpec({
          with: {
            node: new VmBun({
              deleteAfterSuccess: false,
            }),
            devPty,
            devServer: new VmDevServer({
              workdir: "/repo",
              runtime: new VmBun(),
              installCommand: "bun install",
              port: 5173,
              templateRepo: TEMPLATE_REPO,
              devCommand: "bun run dev:preview -- --host",
              devCommandPty: devPty,
              env: {
                PATH: "/opt/bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                BUN_INSTALL: "/opt/bun",
              },
            }),
          },
        }),
        with: {
          devServer: new VmDevServer({
            repo: repoId,
          }),
        },
      }),
      domains: [
        {
          domain,
          vmPort: 5173,
        },
      ],
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

export async function createComponent({
  name,
  component,
  css,
  variants,
  argDefs,
}: {
  name: string;
  component: string;
  css?: string;
  variants: Record<string, Record<string, unknown>>;
  argDefs: Record<string, { control: { type: string; options?: string[]; min?: number; max?: number; step?: number }; description?: string }>;
}): Promise<{ domain: string }> {
  const { vm, domain } = await ensureSandbox();

  const componentSource = css
    ? `import './component.css';\n${component}`
    : component;
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

export function getDomain(): string | null {
  return currentSandbox?.domain ?? null;
}
