// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { CrashGameServer } from "./game.js";
import { mountApi } from "./api.js";

const ADMIN_SECRET = JSON.parse(process.env.ADMIN_SECRET_KEY);
const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";

const server = new CrashGameServer(ADMIN_SECRET, RPC);

// Config from .env
const HOUSE_EDGE = Number(process.env.HOUSE_EDGE) || 5;
const MIN_BET = BigInt(process.env.MIN_BET) || 1_000_000n;
const MAX_BET = BigInt(process.env.MAX_BET) || 100_000_000n;
const ROUND_DURATION_MS = Number(process.env.ROUND_DURATION_MS) || 30_000;
const GAP_BETWEEN_ROUNDS_MS = Number(process.env.GAP_BETWEEN_ROUNDS_MS) || 5_000;

// HTTP API
const app = express();
app.use(cors());
app.use(express.json());
mountApi(app, server);
app.listen(4000, () => console.log("API: http://localhost:4000"));

async function main() {
  const cfg = await server.getConfig();
  if (!cfg) {
    console.log("Initializing game...");
    await server.initialize(HOUSE_EDGE);
    await server.updateConfig(MIN_BET, MAX_BET, HOUSE_EDGE);
  } else {
    console.log(`Game ready (houseEdge=${cfg.houseEdge}%, min=${cfg.minBet}, max=${cfg.maxBet})`);
  }

  let roundId = Number(cfg?.totalGames || 0) + 1;

  const runRound = async () => {
    const crashPoint = Math.floor(Math.random() * 900) + 100; // 100–999 → 1.00–9.99x
    await server.startRound(roundId, crashPoint);
    console.log(`Round ${roundId} – crash ${crashPoint / 100}x – waiting ${ROUND_DURATION_MS / 1000}s`);

    await new Promise((r) => setTimeout(r, ROUND_DURATION_MS));
    await server.endRound(roundId);
    console.log(`Round ${roundId} finished`);

    roundId++;
    setTimeout(runRound, GAP_BETWEEN_ROUNDS_MS);
  };

  runRound();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});