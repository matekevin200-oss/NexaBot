from pathlib import Path

root = Path(__file__).resolve().parent
order = (root / "module-order.txt").read_text(encoding="utf-8").splitlines()
if not order or len(order) != len(set(order)):
    raise SystemExit("module-order.txt is empty or contains duplicate modules")

missing = [name for name in order if not (root / name).is_file()]
if missing:
    raise SystemExit("Missing source module(s): " + ", ".join(missing))

header = (root / "bundle-header.txt").read_text(encoding="utf-8")
footer = (root / "bundle-footer.txt").read_text(encoding="utf-8")
factories = []
for name in order:
    body = (root / name).read_text(encoding="utf-8").rstrip("\n")
    factories.append(f'"{name}": function(module, exports, require) {{\n{body}\n\n}}')

output = header + ",\n".join(factories) + footer
target = root / "index.js"
target.write_text(output, encoding="utf-8")
print(f"Bundled {len(factories)} modules into {target.name}.")
