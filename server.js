const express = require("express");
const path = require("path");

// Si quieres usar .env (recomendado)
try {
    require("dotenv").config();
} catch (_) { }

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 URL de la API externa
const LEAD_API_URL = process.env.LEAD_API_URL || "https://tu-api.com/leads";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

    const payload = {
        nombre: String(nombre).trim(),
        edad: edadNum,
        correo: correo.trim().toLowerCase()
    };

    try {
        const apiResponse = await fetch(LEAD_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Si necesitas auth:
                // "Authorization": `Bearer ${process.env.API_TOKEN}`
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const text = await apiResponse.text();
            console.error("❌ Error API externa:", text);

            return res.status(502).json({
                ok: false,
                message: "Error enviando el lead",
            });
        }

        const data = await apiResponse.json().catch(() => ({}));

        return res.status(201).json({
            ok: true,
            message: "Lead enviado correctamente",
            externalResponse: data,
        });

    } catch (err) {
        console.error("❌ Error conectando con la API:", err);

        return res.status(500).json({
            ok: false,
            message: "No se pudo conectar con el servicio de leads",
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
