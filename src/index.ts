import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./database/data-source";
import userRoutes from "./routes/userRoutes";
import tournamentRoutes from "./routes/tournamentRoutes";
import inscriptionRoutes from "./routes/inscriptionRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/inscriptions", inscriptionRoutes);

// Ruta de prueba
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "ChessManager API is running!",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("📦 Conectado a la base de datos");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
      console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
      console.log(`🏆 Tournaments API: http://localhost:${PORT}/api/tournaments`);
      console.log(`📝 Inscriptions API: http://localhost:${PORT}/api/inscriptions`);
    });
  })
  .catch((error) => console.error("❌ Error al conectar a la base de datos:", error));
