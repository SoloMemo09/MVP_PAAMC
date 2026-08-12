import scapy.all as scapy 
import requests
import time 
import socket 
import sys
import concurrent.futures
import json
import logging 
import os 


from dotenv import load_dotenv
load_dotenv()  # Carga las variables de entorno desde el archivo .env


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout
)

if len(sys.argv) < 2:
    sys.exit()
else: rango_dir = sys.argv[1]

def procesar_puerto(ip, puerto):
    logging.info(f"Probando el puerto {puerto} en la IP {ip}...")
    if comprobar_conexion(ip, puerto) == True:
        banner = obtener_banner(ip, puerto)

        return {"puerto": puerto, "banner": banner.strip()}
    else:
        return None
    
def obtener_banner(ip, puerto):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((ip, puerto))
        s.send(b"HEAD / HTTP/1.1\r\n\r\n")
        banner = s.recv(1024).decode('utf-8', errors='ignore')
        s.close()
        return banner
    except:
        return "Banner desconocido"
    
def comprobar_conexion(ip, puerto):

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    resultad = s.connect_ex((ip, puerto))
    s.close()
    if resultad == 0:
        return True
    else:
        return False
    
def obtener_fabricante(mac):
    url = f"https://api.macvendors.com/{mac}"
    intentos = 0
    intentos_maximos = 3

    while intentos < intentos_maximos:
        try:
            respuesta = requests.get(url)
            if respuesta.status_code == 200:
                return respuesta.text
        except requests.RequestException as e :
            logging.error(f"Error al obtener el fabricante para la MAC {mac}: {e}") 
            intentos += 1
            time.sleep(1)
    return "Desconocido"

def escanear_red(rango): 
    ans, unans = scapy.srp(scapy.Ether(dst="ff:ff:ff:ff:ff:ff")/scapy.ARP(pdst=rango), timeout=2, verbose=False)
    
    lista = []
    for enviado, recibido in ans:
        fabricante = obtener_fabricante(recibido.hwsrc)
        lista.append({"ip": recibido.psrc, "mac": recibido.hwsrc, "fabricante": fabricante})

    return lista


def imprimir_resultados(lista):
    
    with open("puertos.txt", "r", encoding="utf-8") as puertos:
        lineas = puertos.readlines()
    
    resultados_finales = []
    
    for resultados in lista:
        ip = resultados["ip"]
        mac = resultados["mac"]
        fabricante = resultados["fabricante"]

        equipo_actual = {
            "ip": ip,
            "mac": mac,
            "fabricante": fabricante,
            "puertos_abiertos": [] 
        }

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futuros = [] 
            
            for puerto in lineas:
                puerto_limpio = int(puerto.strip())
               
                ticket = executor.submit(procesar_puerto, ip, puerto_limpio)
                futuros.append(ticket)
            
            
            for ticket in concurrent.futures.as_completed(futuros):
                resultado = ticket.result() 
                
               
                if resultado is not None:
                    equipo_actual["puertos_abiertos"].append(resultado)
                    
        resultados_finales.append(equipo_actual)
    print(json.dumps(resultados_finales, indent=4, ensure_ascii=False))
    
    return resultados_finales


if __name__ == "__main__":
    logging.info(f"Iniciando motor de escaneo en el objetivo: {rango_dir}")
    
    resultados_red = escanear_red(rango_dir)
    logging.info(f"Escaneo de red finalizado. Se encontraron {len(resultados_red)} dispositivos.")
    
    if len(resultados_red) > 0:
        logging.info("Iniciando escaneo concurrente de puertos...")
        resultados_devueltos = imprimir_resultados(resultados_red)
        
        logging.info("Proceso finalizado exitosamente. JSON generado.")

        url = "http://localhost:3000/scan"

        cabeceras = {
            "x-api-key": os.getenv("API_KEY"),
            "Content-Type": "application/json"
            }

        datos = {
            "cidr": rango_dir,
            "resultados": resultados_devueltos
            }

        respuesta = requests.post(url, json=datos, headers=cabeceras)

        if respuesta.status_code in [200, 201]:
            logging.info("DATOS ENVIADOS A LA API Y GUARDADOS EN SUPABASE CON ÉXITO.")
        else:
            logging.error(f"ERROR AL ENVIAR A LA API. CÓDIGO: {respuesta.status_code}")
    else:
        logging.warning("No se encontraron dispositivos en la red para escanear.")


