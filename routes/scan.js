const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { spawn } = require('child_process');
const path = require('path');

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
    if (!scanData || scanData.length === 0) throw new Error("No se pudo registrar el escaneo en la base de datos.");

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

        if (assetError) {
          console.error("Error al guardar activo:", assetError);
          continue; // Pasamos al siguiente dispositivo
        }
        if (!assetData || assetData.length === 0) {
          console.error("No se retornaron datos del activo.");
          continue;
        }

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

// 3. POST /scan/run - Ejecutar el script Python
router.post('/run', async (req, res) => {
  const { cidr } = req.body;
  if (!cidr) {
    return res.status(400).json({ error: 'Rango CIDR requerido' });
  }

  // La ruta al script python asumiendo que Node corre en la raíz del proyecto
  const scriptPath = path.join(__dirname, '..', 'Escaneos', 'scanner.py');
  
  // Usamos el entorno virtual si existe en la carpeta Escaneos, sino el python global
  const pythonExecutable = process.platform === 'win32' 
    ? path.join(__dirname, '..', 'Escaneos', 'venv', 'Scripts', 'python.exe')
    : path.join(__dirname, '..', 'Escaneos', 'venv', 'bin', 'python');
    
  console.log(`[API] Iniciando escaneo para la red: ${cidr}`);
  console.log(`[API] Ejecutable: ${pythonExecutable}`);

  // Iniciar el subproceso en segundo plano sin esperar a que termine (Fire and forget)
  // El script python se encarga de hacer POST a /scan cuando termina.
  const escaneosDir = path.join(__dirname, '..', 'Escaneos');
  const pythonProcess = spawn(pythonExecutable, [scriptPath, cidr], {
    detached: true,
    windowsHide: true, // Esto evita que se abra la ventana de terminal en Windows
    cwd: escaneosDir // Para que encuentre puertos.txt y .env correctamente
  });
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python Scanner] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Scanner Error] ${data}`);
  });

  pythonProcess.unref();

  res.status(202).json({ 
    mensaje: 'Escaneo iniciado en segundo plano exitosamente',
    cidr: cidr
  });
});

router.get('/latest', async (req, res) => {
  try {
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Usar maybeSingle evita el error si no hay filas en la tabla

    if (error) throw error;

    res.status(200).json(scan || null);
  } catch (err) {
    console.error('Error al obtener el último escaneo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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

module.exports = router;