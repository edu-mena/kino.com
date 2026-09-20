// Servidor de estado partilhado para testar o Luku com dados mock em vários
// dispositivos na mesma rede — ver mock-server/README.md. Isolado de
// propósito: zero dependências (só node:http/node:fs), nada aqui é
// importado pelo resto do projeto. Guarda um JSON simples { chave: valor },
// exatamente o formato de um localStorage — o cliente (ver
// src/lib/shared-mock-sync.ts) é que sabe o que cada chave significa.

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "state.json");
const PORT = Number(process.env.PORT) || 4001;

let state = {};
try {
  state = JSON.parse(await readFile(STATE_FILE, "utf8"));
} catch {
  // primeiro arranque, ou ficheiro corrompido/apagado — começa vazio
  state = {};
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await writeFile(STATE_FILE, JSON.stringify(state), "utf8");
    } catch (err) {
      console.error("[mock-server] falha ao gravar state.json:", err);
    }
  }, 500);
}

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = createServer(async (req, res) => {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(state));
    return;
  }

  const keyMatch = url.pathname.match(/^\/state\/(.+)$/);
  if (keyMatch) {
    const key = decodeURIComponent(keyMatch[1]);

    if (req.method === "PUT") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const value = Buffer.concat(chunks).toString("utf8");
      state[key] = value;
      scheduleSave();
      console.log(`[mock-server] PUT ${key} (${value.length} bytes)`);
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "DELETE") {
      delete state[key];
      scheduleSave();
      console.log(`[mock-server] DELETE ${key}`);
      res.writeHead(204);
      res.end();
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-server] a correr em http://0.0.0.0:${PORT} (estado em ${STATE_FILE})`);
  console.log(`[mock-server] aponta o frontend com VITE_SHARED_MOCK_URL=http://<IP-desta-máquina>:${PORT}`);
});
