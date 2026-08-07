require('dotenv').config();
const express = require('express');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware para entender JSON en las peticiones
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Transporte PAMRC activa ');
});

// Middleware de Autenticación
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Acceso no autorizado: API Key inválida o ausente' });
  }
  
  next(); // Si la clave es correcta, permite el paso
};

app.use(authMiddleware);

app.post('/scans', async (req, res) => {
  // 1. Tomamos el rango CIDR que nos envía el escáner (ej: "192.168.1.0/24")
  const { cidr } = req.body;

  // Validamos que al menos nos hayan enviado el dato 'cidr'
  if (!cidr) {
    return res.status(400).json({ error: 'El campo "cidr" es obligatorio' });
  }

  // 2. Intentamos guardarlo en la tabla 'scans' de Supabase
  const { data, error } = await supabase
    .from('scans')
    .insert([{ cidr_range: cidr }])
    .select();

  // 3. Si Supabase devuelve un error, respondemos con código 500 (Error del servidor)
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 4. Si todo salió bien, respondemos con código 201 (Creado) y los datos guardados
  res.status(201).json({
    mensaje: 'Escaneo registrado con éxito en la base de datos 🚀',
    escaneo: data[0]
  });
});


// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
