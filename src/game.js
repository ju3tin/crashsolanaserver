// src/game.js
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load IDL using fs (works on all Node.js versions)
const idl = JSON.parse(
  readFileSync(join(__dirname, "..", "target", "idl", "crash_game.json"), "utf8")
);

export const PROGRAM_ID = new PublicKey(
  "CX9N85RmEnkFybbab3YTfQViUN4SvsTxrLy7Po2aWzGf"
);

export class CrashGameServer {
  constructor(adminSecret, rpcUrl) {
    this.admin = Keypair.fromSecretKey(Uint8Array.from(adminSecret));
    this.connection = new Connection(rpcUrl, "confirmed");
    this.provider = new AnchorProvider(this.connection, this.admin, {
      commitment: "confirmed",
    });
    this.program = new Program(idl,PROGRAM_ID, this.provider);

    const [gameConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_config")],
      PROGRAM_ID
    );
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      PROGRAM_ID
    );
    this.gameConfigPDA = gameConfigPDA;
    this.vaultPDA = vaultPDA;
  }

  async initialize(houseEdge) {
    const tx = await this.program.methods
      .initialize(houseEdge)
      .accounts({
        game_config: this.gameConfigPDA,
        authority: this.admin.publicKey,
        system_program: SystemProgram.programId,
      })
      .rpc();
    console.log(`Initialized (houseEdge=${houseEdge}%) – tx: ${tx}`);
  }

  async updateConfig(minBet, maxBet, houseEdge) {
    const tx = await this.program.methods
      .updateConfig(
        minBet ? new web3.BN(minBet.toString()) : null,
        maxBet ? new web3.BN(maxBet.toString()) : null,
        houseEdge ?? null
      )
      .accounts({
        game_config: this.gameConfigPDA,
        authority: this.admin.publicKey,
      })
      .rpc();
    console.log(`Config updated – tx: ${tx}`);
  }

  async startRound(roundId, crashPoint) {
    const [roundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), Buffer.from(new web3.BN(roundId).toArray(":Content:le", 8))],
      PROGRAM_ID
    );

    const tx = await this.program.methods
      .startRound(new web3.BN(roundId), crashPoint)
      .accounts({
        game_config: this.gameConfigPDA,
        game_round: roundPDA,
        authority: this.admin.publicKey,
        system_program: SystemProgram.programId,
      })
      .rpc();

    console.log(`Round ${roundId} STARTED (crash ${crashPoint / 100}x) – tx: ${tx}`);
    return roundId;
  }

  async endRound(roundId) {
    const [roundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), Buffer.from(new web3.BN(roundId).toArray("le", 8))],
      PROGRAM_ID
    );

    const tx = await this.program.methods
      .endRound()
      .accounts({
        game_config: this.gameConfigPDA,
        game_round: roundPDA,
        authority: this.admin.publicKey,
      })
      .rpc();

    console.log(`Round ${roundId} ENDED – tx: ${tx}`);
  }

  async getConfig() {
    try {
      return await this.program.account.gameConfig.fetch(this.gameConfigPDA);
    } catch (e) {
      return null;
    }
  }
}