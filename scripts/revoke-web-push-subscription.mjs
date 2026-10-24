import Database from "better-sqlite3";
import process from "node:process";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value === "--confirm") {
    args.set("confirm", "true");
  } else if (value?.startsWith("--")) {
    args.set(value.slice(2), process.argv[index + 1]);
    index += 1;
  }
}

const endpoint = args.get("endpoint");
const ownerId = args.get("owner-id");
const ownerRole = args.get("owner-role");
const dbPath = args.get("db-path") ?? process.env.DB_PATH ?? "./data/motofleet.db";
if (!endpoint) {
  console.error("Usage: npm run ops:revoke-web-push -- --endpoint <url> [--owner-id <id> --owner-role <role> --confirm]");
  process.exit(1);
}

const db = new Database(dbPath);
try {
  const row = db
    .prepare(
      "SELECT owner_id, owner_role, updated_at FROM web_push_subscriptions WHERE endpoint = ?",
    )
    .get(endpoint);
  if (!row) {
    console.log("No Web Push subscription found for that endpoint.");
    process.exit(0);
  }

  console.log(`Found Web Push subscription owner=${row.owner_id} role=${row.owner_role} updated_at=${row.updated_at}`);
  if (args.get("confirm") !== "true") {
    console.log("Dry run only. Re-run with --owner-id, --owner-role and --confirm to revoke.");
    process.exit(0);
  }
  if (ownerId !== row.owner_id || ownerRole !== row.owner_role) {
    console.error("The supplied owner identity does not match the stored subscription.");
    process.exit(1);
  }

  const result = db
    .prepare(
      "DELETE FROM web_push_subscriptions WHERE endpoint = ? AND owner_id = ? AND owner_role = ?",
    )
    .run(endpoint, ownerId, ownerRole);
  console.log(result.changes === 1 ? "Web Push subscription revoked." : "Subscription was already absent.");
} finally {
  db.close();
}
