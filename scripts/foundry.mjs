import { createRequire } from "node:module";
import { spawn } from "node:child_process";

// The upstream npm launcher does not propagate child exit codes in 1.7.1.
// Execute the same packaged binary directly so a failing test fails CI.
const [tool, ...args] = process.argv.slice(2);
if (!["forge", "anvil"].includes(tool)) throw new Error("Expected forge or anvil");
const require = createRequire(import.meta.url);
const toolRequire = createRequire(require.resolve(`@foundry-rs/${tool}/package.json`));
const arch = process.arch === "x64" ? "amd64" : process.arch;
const binary = toolRequire.resolve(
  `@foundry-rs/${tool}-${process.platform}-${arch}/bin/${tool}${process.platform === "win32" ? ".exe" : ""}`,
);
const child = spawn(binary, args, { stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
