import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const source = path.resolve("src/migrations");
const destination = path.resolve("dist/migrations");

if (!existsSync(source)) {
  throw new Error(`Migration source directory not found: ${source}`);
}

cpSync(source, destination, { recursive: true });
console.log(`Copied migrations to ${destination}`);
