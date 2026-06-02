const fs = require("fs");
const { execSync } = require("child_process");

// .env manuell einlesen, da Node sie nicht automatisch lädt
const env = {};
for (const file of [".env", ".env.local"]) {
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) env[key.trim()] = rest.join("=").trim();
    }
  }
}

const debug = env["EXPO_PUBLIC_DEBUG"] === "true";

if (debug) {
  console.log("EXPO_PUBLIC_DEBUG=true: Baue MkDocs-Dokumentation...");
  execSync("python3 -m mkdocs build --quiet", { stdio: "inherit" });
  console.log("Dokumentation verfügbar unter http://localhost:8081/docs");
} else {
  fs.rmSync("public/docs", { recursive: true, force: true });
}
