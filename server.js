const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// Si quieres usar .env (recomendado)
try {
    require("dotenv").config();
} catch (_) { }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Pool Postgres
const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "rumbly",
    user: process.env.PGUSER || "rumbly",
    password: process.env.PGPASSWORD || "rumbly",
    ssl:
        process.env.PGSSL === "true"
            ? { rejectUnauthorized: false }
            : undefined,
});

// Pequeño helper para errores únicos de Postgres
function isUniqueViolation(err) {
    return err && err.code === "23505";
}

app.post("/api/lead", async (req, res) => {
    const { nombre, edad, correo } = req.body || {};

    // Validación básica
    const errors = [];
    if (!nombre || String(nombre).trim().length < 2) errors.push("nombre");

    const edadNum = Number(edad);
    if (!Number.isFinite(edadNum) || edadNum < 18 || edadNum > 100)
        errors.push("edad");

    const emailOk =
        typeof correo === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
    if (!emailOk) errors.push("correo");

    if (errors.length) {
        return res.status(400).json({
            ok: false,
            message: "Datos inválidos",
            fields: errors,
        });
    }

    const email = correo.trim().toLowerCase();
    const firstName = String(nombre).trim();

    // ✅ apellido no existe en tu form; ponemos placeholder
    const lastName = ".";

    // ✅ password_hash requerido: generamos una contraseña aleatoria (no usable)
    // (si luego conviertes lead -> usuario real, lo migras con “set password”)
    const randomPass = `lead_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const passwordHash = await bcrypt.hash(randomPass, 10);

    try {
        const query = `
      INSERT INTO public.users (nombre, apellido, edad, password_hash, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, email;
    `;
        const values = [firstName, lastName, edadNum, passwordHash, email];

        const result = await pool.query(query, values);

        return res.status(201).json({
            ok: true,
            message: "Lead guardado",
            user: result.rows[0],
        });
    } catch (err) {
        // email unique
        if (isUniqueViolation(err)) {
            return res.status(409).json({
                ok: false,
                message: "Ese email ya está registrado",
            });
        }

        console.error("❌ Error insertando lead:", err);
        return res.status(500).json({
            ok: false,
            message: "Error interno guardando el lead",
        });
    }
});

// Ruta principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Rumbly landing corriendo en puerto ${PORT}`);
});
