const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Middleware para validar la API Key
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
};

// 1. POST /scan - Recibir e guardar los datos completos
router.post('/', apiKeyMiddleware, async (req, res) => {
  try {
    const { cidr, resultados } = req.body;

    // A. Registramos la ejecución del escaneo en la tabla 'scans'
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .insert({ cidr_range: cidr })
      .select();

    if (scanError) throw scanError;

    // B. Guardamos cada dispositivo encontrado en la tabla 'assets'
    if (resultados && resultados.length > 0) {
      for (const dispositivo of resultados) {
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .insert({
            scan_id: scanData[0].id,  
            ip_address: dispositivo.ip,
            mac_address: dispositivo.mac,
            vendor: dispositivo.fabricante
          })
          .select();

        if (assetError) console.error("Error al guardar activo:", assetError);

        // 2. Guardamos los puertos (AÚN DENTRO DEL BUCLE)
        if (dispositivo.puertos_abiertos && dispositivo.puertos_abiertos.length > 0) {
          for (const puertoInfo of dispositivo.puertos_abiertos) {
            const { error: portError } = await supabase
              .from('ports')
              .insert({
                asset_id: assetData[0].id,
                port_number: puertoInfo.puerto,
                protocol: 'TCP',
                state: 'open'
              });
             if (portError) console.error("Error al guardar puerto:", portError);
          }
        } 

      } 
  }

   

    res.status(201).json({ 
      mensaje: 'Escaneo y activos guardados exitosamente', 
      scan: scanData 
    });

  } catch (error) {
    console.error("Error en servidor:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    res.status(200).json(scan);
  } catch (err) {
    console.error('Error al obtener el último escaneo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

// 2. GET /scan - Obtener la lista de escaneos guardados
router.get('/', apiKeyMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*'); // '*' significa trae todas las columnas

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar escaneos' });
  }
});