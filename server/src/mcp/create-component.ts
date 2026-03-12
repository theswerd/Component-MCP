import { freestyle, VmSpec } from "freestyle-sandboxes";
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
export async function createComponent() {
  const { repoId, repo } = await freestyle.git.repos.create({
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

  const { vm, vmId } = await freestyle.vms.create({
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

  return { domain };
}
