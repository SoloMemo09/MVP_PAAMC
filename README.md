# PAAMC (Network Scanner Dashboard)

👋 Holaaa

PAAMC es un sistema integral para el descubrimiento de dispositivos en redes locales y el escaneo de puertos, que presenta la información recopilada en un moderno panel de control web. El proyecto está dividido en tres componentes principales: un motor de escaneo en Python, una API RESTful en Node.js, y un Frontend desarrollado con Astro.

## Arquitectura del Proyecto

El proyecto sigue una arquitectura distribuida donde cada componente tiene una responsabilidad clara:

1. **Escáner (Python):** Se encarga del descubrimiento de red a bajo nivel utilizando `Scapy` (ARP pings) y la inspección de puertos abiertos mediante `Sockets`. También resuelve el fabricante del dispositivo a través de la API `macvendors`.
2. **Backend (Node.js/Express):** Actúa como orquestador y puente con la base de datos (Supabase). Maneja las peticiones para lanzar nuevos escaneos (ejecutando el script de Python de fondo) y proporciona endpoints para consultar los resultados históricos.
3. **Frontend (Astro/TailwindCSS):** Es la interfaz de usuario moderna que consume los datos del Backend y los muestra en tarjetas dinámicas. Permite disparar nuevos escaneos de forma visual y se actualiza en tiempo real sin recargar la página.

## Requisitos Previos

- **Node.js** (v18 o superior)
- **Python** (v3.10 o superior)
- Una cuenta de **Supabase** para la base de datos.
- Npcap/WinPcap (Si estás en Windows, necesario para Scapy).

## Estructura del Repositorio

```
PAAMC/
├── Escaneos/                 # Motor de escaneo de red
│   ├── scanner.py            # Script principal (Scapy + Sockets)
│   ├── puertos.txt           # Lista de puertos a escanear
│   └── requirements.txt      # Dependencias de Python
├── config/                   # Configuración del backend
│   └── supabase.js           # Cliente de conexión a Supabase
├── routes/                   # Controladores/Rutas de Express
│   ├── scan.js               # Rutas de escaneo y ejecución
│   └── assets.js             # Rutas para consultar dispositivos
├── dashboard/                # Frontend Web (Astro)
│   ├── src/
│   │   ├── components/       # Componentes reutilizables (Sidebar, Cards)
│   │   ├── layouts/          # Plantillas globales
│   │   └── pages/            # Páginas web (index)
│   └── package.json          # Dependencias del frontend
├── index.js                  # Archivo principal de Node.js (Servidor)
└── package.json              # Dependencias del backend
```

## Configuración e Instalación

### 1. Variables de Entorno (.env)

Debes crear dos archivos `.env`, uno en la raíz del proyecto (`PAAMC/.env`) y opcionalmente uno en la carpeta del frontend. 

**En la raíz del proyecto (`PAAMC/.env`):**
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_api_key_anon_o_service_role
API_KEY=tu_contraseña_secreta_para_api
PORT=3000
```

*(Asegúrate de nunca subir estos archivos a GitHub. El `.gitignore` ya está configurado para omitirlos).*

### 2. Configurar la Base de Datos (Supabase)

Debes tener creadas las siguientes tablas en Supabase:
- `scans` (id, created_at, cidr_range)
- `assets` (id, scan_id, ip_address, mac_address, vendor, created_at)
- `ports` (id, asset_id, port_number, protocol, state, created_at)

### 3. Instalación del Backend (Node.js)

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
npm install
```

### 4. Instalación del Escáner (Python)

Es altamente recomendable usar un entorno virtual para las dependencias de Python.

```bash
cd Escaneos
python -m venv venv

# En Windows:
.\venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### 5. Instalación del Frontend (Astro)

Abre otra terminal, ve a la carpeta del dashboard e instala las dependencias:

```bash
cd dashboard
npm install
```

## Ejecución del Sistema

Para arrancar el sistema completo necesitarás dos terminales:

**Terminal 1: Servidor Backend**
```bash
# Desde la raíz del proyecto (PAAMC/)
npm start
# o
node index.js
```
*Esto iniciará la API de Express en el puerto 3000.*

**Terminal 2: Frontend Dashboard**
```bash
# Desde la carpeta dashboard/
npm run dev
```
*Esto abrirá la aplicación de Astro, generalmente en `http://localhost:4321`.*

## Uso de la Interfaz

1. Abre tu navegador en la URL del Frontend.
2. En la barra lateral izquierda, haz clic en el botón **"New Scan"**.
3. Ingresa tu rango de red en formato CIDR (por ejemplo, `192.168.1.0/24`).
4. Haz clic en **"Run Scan"**. El panel se actualizará automáticamente una vez que el motor de Python termine de recopilar los datos.

## Seguridad

- Toda la comunicación de "escritura" desde el script de Python hacia el Backend de Node.js está protegida por un middleware que verifica la cabecera `x-api-key`.
- Los archivos `.env` están agregados al `.gitignore` para evitar fugas de información sensible.
