import { useState, type ReactNode } from "react";

export type ControlType =
  | { type: "text" }
  | { type: "boolean" }
  | { type: "color" }
  | { type: "select"; options: string[] }
  | { type: "number"; min?: number; max?: number; step?: number };

export interface ArgDef {
  control: ControlType;
  defaultValue?: unknown;
  description?: string;
}

function ControlInput({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: ArgDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { control } = def;

  switch (control.type) {
    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 accent-indigo-500"
          />
          <span className="text-sm text-zinc-400">
            {String(value)}
          </span>
        </label>
      );

    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value || "#000000")}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-zinc-700 p-0"
          />
          <input
            type="text"
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="transparent"
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300 w-28"
          />
        </div>
      );

    case "select":
      return (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300"
        >
          {control.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "number":
      return (
        <input
          type="number"
          value={Number(value ?? 0)}
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-24 rounded border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300"
        />
      );

    case "text":
    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300 w-48"
        />
      );
  }
}

export function Controls({
  argDefs,
  values,
  onChange,
  variantNames,
  activeVariant,
  onVariantChange,
}: {
  argDefs: Record<string, ArgDef>;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  variantNames?: string[];
  activeVariant?: string;
  onVariantChange?: (name: string) => void;
}) {
  const [minimized, setMinimized] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-700 bg-zinc-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Controls
        </span>
        <button
          onClick={() => setMinimized(!minimized)}
          className="text-zinc-400 hover:text-zinc-200 text-xs px-1.5 py-0.5 rounded transition-colors"
        >
          {minimized ? "+" : "\u2013"}
        </button>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: minimized ? "0fr" : "1fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-xs text-zinc-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Control</th>
              </tr>
            </thead>
            <tbody>
              {variantNames && onVariantChange && (
                <tr className="border-b border-zinc-800">
                  <td className="px-4 py-2.5">
                    <code className="text-xs font-mono text-zinc-300 bg-transparent">
                      variant
                    </code>
                    <p className="text-xs mt-0.5 text-zinc-500">
                      Story variant
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {variantNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => onVariantChange(name)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                            activeVariant === name
                              ? "border-indigo-500 bg-indigo-950 text-indigo-400"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {Object.entries(argDefs).map(([name, def]) => (
                <tr
                  key={name}
                  className="border-b border-zinc-800 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <code className="text-xs font-mono text-zinc-300 bg-transparent">
                      {name}
                    </code>
                    {def.description && (
                      <p className="text-xs mt-0.5 text-zinc-500">
                        {def.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <ControlInput
                      name={name}
                      def={def}
                      value={values[name]}
                      onChange={(v) => onChange({ ...values, [name]: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export interface ComponentDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  variants: Record<string, Record<string, unknown>>;
  args: Record<string, ArgDef>;
}

export function StoryPreview({
  componentDef,
}: {
  componentDef: ComponentDef;
}) {
  const names = Object.keys(componentDef.variants);
  const [active, setActive] = useState(names[0]);
  const [argsMap, setArgsMap] = useState<Record<string, Record<string, unknown>>>(
    () => Object.fromEntries(Object.entries(componentDef.variants).map(([k, v]) => [k, v]))
  );

  const args = argsMap[active];
  const setArgs = (next: Record<string, unknown>) =>
    setArgsMap((prev) => ({ ...prev, [active]: next }));

  const displayArgs = Object.fromEntries(
    Object.entries(args).filter(([, v]) => typeof v !== "function")
  );

  const Component = componentDef.component;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 p-8 min-h-[120px]">
        <Component {...args} />
      </div>
      <Controls
        argDefs={componentDef.args}
        values={displayArgs}
        onChange={(next) => setArgs({ ...args, ...next })}
        variantNames={names}
        activeVariant={active}
        onVariantChange={setActive}
      />
    </div>
  );
}
