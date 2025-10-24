// src/api.js
export function mountApi(app, server) {
    app.post("/admin/initialize", async (req, res) => {
      const { houseEdge } = req.body;
      try {
        await server.initialize(houseEdge ?? 5);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  
    app.post("/admin/update-config", async (req, res) => {
      const { minBet, maxBet, houseEdge } = req.body;
      try {
        await server.updateConfig(
          minBet ? BigInt(minBet) : undefined,
          maxBet ? BigInt(maxBet) : undefined,
          houseEdge
        );
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  
    app.post("/admin/start", async (req, res) => {
      const { roundId, crashPoint } = req.body;
      try {
        await server.startRound(roundId, crashPoint);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  
    app.post("/admin/end", async (req, res) => {
      const { roundId } = req.body;
      try {
        await server.endRound(roundId);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  }