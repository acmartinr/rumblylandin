const express = require("express");
const path = require("path");

try {
    require("dotenv").config();
} catch (_) { }

const app = express();
const PORT = process.env.PORT || 3000;

const LEAD_API_URL = "http://parrandapp.com:4000/api/users/lead";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/lead", async (req, res) => {
    const { nombre, edad, correo, provincia, telefono } = req.body || {};  // ✅ añadido telefono

    // Validación básica
    const errors = [];
    if (!nombre || String(nombre).trim().length < 2) errors.push("nombre");

    if (!provincia || String(provincia).trim().length < 2) errors.push("provincia");

    const edadNum = Number(edad);
    if (!Number.isFinite(edadNum) || edadNum < 16 || edadNum > 100)
        errors.push("edad");

    const emailOk =
        typeof correo === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
    if (!emailOk) errors.push("correo");

    // ✅ Teléfono opcional — solo valida si viene informado
    const phoneRaw = telefono ? String(telefono).trim() : null;
    if (phoneRaw && !/^\+?[\d\s\-().]{6,20}$/.test(phoneRaw)) {
        errors.push("telefono");
    }

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
        correo: correo.trim().toLowerCase(),
        provincia: String(provincia).trim(),
        telefono: phoneRaw || null,  // ✅ añadido al payload
    };

    try {
        const apiResponse = await fetch(LEAD_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // "Authorization": `Bearer ${process.env.API_TOKEN}`
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));

            if (apiResponse.status === 409) {
                return res.status(409).json({
                    ok: false,
                    message: "Ya estás registrado en JOIN. Pronto te avisaremos para que puedas comenzar a usar nuestros servicios.",
                });
            }

            console.error("❌ Error API externa:", errorData);

            return res.status(502).json({
                ok: false,
                message: "Error interno",
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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 JOIN landing corriendo en puerto ${PORT}`);
});