require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para entender JSON en el cuerpo de las peticiones
app.use(express.json());

// Importamos el módulo de rutas que acabamos de crear
const scansRoutes = require('./routes/scan');

// Le decimos a Express: todas las peticiones que empiecen con /scans, úsalas con scansRoutes
app.use('/scan', scansRoutes);

const assetsRoutes = require('./routes/assets');

app.use('/assets', assetsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});