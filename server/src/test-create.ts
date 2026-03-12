import { createComponent } from "./mcp/create-component.js";

const result = await createComponent({
  name: "Button",
  component: `export function Button({ label = "Click me" }: { label?: string }) {
  return <button>{label}</button>;
}`,
  variants: { Default: { label: "Click me" } },
  argDefs: {
    label: { control: { type: "text" }, description: "Button label" },
  },
});
console.log(result);
