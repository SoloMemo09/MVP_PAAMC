const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.get('/', async (req, res) => {
  try {
    // 1. Hacemos la consulta a Supabase
    const { data: activos, error } = await supabase
      .from('assets')
      .select();

    // 2. Manejo de error
    if (error) throw error;
    
    // 3. Respuesta exitosa (enviar los activos al dashboard)
    res.status(200).json(activos);

  } catch (err) {
    console.error("Error al obtener activos:", err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Hacemos la consulta a Supabase para obtener el activo por ID
    const { data: activo, error } = await supabase
      .from('assets')
      .select( '*, ports(*)' )
      .eq('id', id)
      .single(); // 'single' asegura que solo se obtenga un registro

    // 2. Manejo de error
    if (error) throw error;

    // 3. Respuesta exitosa (enviar el activo al dashboard)
    res.status(200).json(activo);

  } catch (err) {
    console.error(`Error al obtener activo con ID ${id}:`, err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exportamos el router para usarlo en el index principa
module.exports = router;