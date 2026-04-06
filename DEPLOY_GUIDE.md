# Guia de Despliegue - MiDoctorYa Lite PWA

## Tabla de Contenidos
1. [Prerequisitos](#1-prerequisitos)
2. [Configuracion Local](#2-configuracion-local)
3. [Variables de Entorno](#3-variables-de-entorno)
4. [Ejecucion Local](#4-ejecucion-local)
5. [Despliegue en Render](#5-despliegue-en-render)
6. [Verificacion Post-Despliegue](#6-verificacion-post-despliegue)
7. [Dominio Personalizado](#7-dominio-personalizado)
8. [SSL / HTTPS](#8-ssl--https)
9. [Monitoreo](#9-monitoreo)
10. [Escalamiento](#10-escalamiento)
11. [Solucion de Problemas](#11-solucion-de-problemas)
12. [Procedimiento de Rollback](#12-procedimiento-de-rollback)

---

## 1. Prerequisitos

Antes de comenzar, asegurate de tener instalado:

| Herramienta | Version Minima | Verificar con |
|-------------|---------------|---------------|
| Python | 3.11+ | `python --version` |
| pip | 23+ | `pip --version` |
| Git | 2.30+ | `git --version` |
| Cuenta Render | Free o Starter | [render.com](https://render.com) |
| Cuenta GitHub | Free | [github.com](https://github.com) |

### Instalar Python (si no lo tienes)

**Windows:**
```bash
# Descargar desde python.org o usar winget
winget install Python.Python.3.11
```

**macOS:**
```bash
brew install python@3.11
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install python3.11 python3.11-venv python3-pip
```

---

## 2. Configuracion Local

### Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/midoctorya-lite.git
cd midoctorya-lite
```

### Crear entorno virtual
```bash
python -m venv venv
```

### Activar entorno virtual

**Windows (PowerShell):**
```bash
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```bash
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### Instalar dependencias
```bash
pip install -r requirements.txt
```

---

## 3. Variables de Entorno

Crea un archivo `.env` en la raiz del proyecto (nunca lo subas a Git):

```bash
cp .env.example .env
```

O crealo manualmente con el siguiente contenido:

```env
# Mercado Pago
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxx
MP_SANDBOX=true

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@midoctorya.com

# UltraMSG (WhatsApp)
ULTRAMSG_INSTANCE=instance_id
ULTRAMSG_TOKEN=token_value

# Google Fit
GOOGLE_FIT_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_FIT_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Admin
ADMIN_PIN=123456
```

### Donde obtener cada credencial:

| Variable | Donde obtenerla |
|----------|----------------|
| `MP_ACCESS_TOKEN` | [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel/app) |
| `SENDGRID_API_KEY` | [SendGrid Settings > API Keys](https://app.sendgrid.com/settings/api_keys) |
| `ULTRAMSG_INSTANCE` / `ULTRAMSG_TOKEN` | [UltraMSG Dashboard](https://ultramsg.com/dashboard) |
| `GOOGLE_FIT_CLIENT_ID` / `SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `ADMIN_PIN` | Elegir un PIN seguro de 6+ digitos |

---

## 4. Ejecucion Local

### Servidor de desarrollo (recomendado para desarrollo)
```bash
python server.py
```
Abre en el navegador: **http://localhost:8081**

### Servidor de produccion (para probar antes de deploy)
```bash
gunicorn server_prod:app --bind 0.0.0.0:8081 --workers 2 --timeout 120
```

### Verificar que funciona
```bash
python test_deploy.py http://localhost:8081
```

Deberias ver algo como:
```
  MiDoctorYa Lite — Smoke Tests
  Base URL: http://localhost:8081

  ==================================================

  PASS  Homepage loads (15ms)
  PASS  Admin panel loads (8ms)
  PASS  Doctor panel loads (7ms)
  ...

  ==================================================
  Results: 15 passed, 0 failed, 15 total

  DEPLOYMENT CHECK: ALL CLEAR
```

---

## 5. Despliegue en Render

### Paso 1: Subir codigo a GitHub

```bash
git init
git add .
git commit -m "Initial commit - MiDoctorYa Lite PWA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/midoctorya-lite.git
git push -u origin main
```

### Paso 2: Crear Web Service en Render

1. Ingresa a [render.com/dashboard](https://dashboard.render.com)
2. Click en **"New +"** > **"Web Service"**
3. Selecciona **"Build and deploy from a Git repository"**
4. Conecta tu cuenta de GitHub si no lo has hecho
5. Selecciona el repositorio **midoctorya-lite**

### Paso 3: Configurar el servicio

Completa los siguientes campos:

| Campo | Valor |
|-------|-------|
| **Name** | `midoctorya-lite` |
| **Region** | `Oregon (US West)` o el mas cercano |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn server_prod:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120` |
| **Plan** | `Starter ($7/mes)` o `Free` para pruebas |

### Paso 4: Agregar variables de entorno

En la seccion **"Environment"**, agrega cada variable:

```
MP_ACCESS_TOKEN       = tu_token_real_de_mercadopago
MP_SANDBOX            = true
SENDGRID_API_KEY      = tu_api_key_de_sendgrid
SENDGRID_FROM_EMAIL   = noreply@midoctorya.com
ULTRAMSG_INSTANCE     = tu_instancia
ULTRAMSG_TOKEN        = tu_token
GOOGLE_FIT_CLIENT_ID  = tu_client_id
GOOGLE_FIT_CLIENT_SECRET = tu_client_secret
ADMIN_PIN             = tu_pin_seguro
PYTHON_VERSION        = 3.11.0
```

> **IMPORTANTE:** Cuando pases a produccion, cambia `MP_SANDBOX=false` y usa el token de produccion de Mercado Pago.

### Paso 5: Configurar Health Check

En la seccion **"Health & Alerts"**:
- **Health Check Path:** `/api/health`
- Esto permite a Render verificar que tu app esta funcionando

### Paso 6: Activar Auto-Deploy

En **"Settings"** > **"Build & Deploy"**:
- Activa **"Auto-Deploy"** = `Yes`
- Cada push a `main` desplegara automaticamente

### Paso 7: Desplegar

1. Click en **"Create Web Service"**
2. Espera a que termine el build (2-5 minutos)
3. Render te dara una URL como: `https://midoctorya-lite.onrender.com`

### Alternativa: Deploy con render.yaml (IaC)

Si prefieres Infrastructure as Code, el proyecto ya incluye `render.yaml`:
```bash
# Render detecta automaticamente render.yaml al conectar el repo
# No necesitas configurar nada manualmente
```

---

## 6. Verificacion Post-Despliegue

### Ejecutar smoke tests contra produccion
```bash
python test_deploy.py https://midoctorya-lite.onrender.com
```

### Verificacion manual
1. Abre `https://tu-url.onrender.com` en el navegador
2. Verifica que carga la pagina principal
3. Abre DevTools (F12) > Application > Service Workers
4. Confirma que el SW esta registrado
5. Prueba el panel de admin: `/admin.html`
6. Prueba el panel de doctor: `/doctor.html`
7. Verifica el health check: `/api/health`

### Verificar instalacion PWA
1. En Chrome, busca el icono de "Instalar" en la barra de direcciones
2. Instala la app y verifica que abre correctamente
3. Desconecta internet y verifica que funciona offline

---

## 7. Dominio Personalizado

### Paso 1: Agregar dominio en Render
1. Ve a tu servicio en Render Dashboard
2. **"Settings"** > **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Ingresa tu dominio: `app.midoctorya.com`

### Paso 2: Configurar DNS
Agrega estos registros en tu proveedor de DNS (GoDaddy, Cloudflare, Namecheap, etc.):

**Para subdominio (recomendado):**
```
Tipo:  CNAME
Nombre: app
Valor:  midoctorya-lite.onrender.com
TTL:    3600
```

**Para dominio raiz:**
```
Tipo:  A
Nombre: @
Valor:  (IP proporcionada por Render)
TTL:    3600
```

### Paso 3: Verificar
```bash
# Espera 5-30 minutos para propagacion DNS
nslookup app.midoctorya.com

# Probar
python test_deploy.py https://app.midoctorya.com
```

---

## 8. SSL / HTTPS

Render proporciona SSL **automaticamente** con Let's Encrypt:

- Se activa al agregar un dominio personalizado
- Se renueva automaticamente cada 90 dias
- No requiere configuracion adicional
- Redirige HTTP a HTTPS automaticamente

Para verificar:
```bash
curl -I https://tu-dominio.com
# Debe mostrar: HTTP/2 200
```

---

## 9. Monitoreo

### Dashboard de Render
- **Metrics:** CPU, memoria, tiempo de respuesta
- **Logs:** Logs en tiempo real del servidor
- **Events:** Historial de deploys y eventos

### Endpoint de Health Check
```bash
# Verificar manualmente
curl https://tu-url.onrender.com/api/health

# Respuesta esperada:
# {"status": "ok", "timestamp": "...", "version": "..."}
```

### Monitor Externo (Recomendado)
Configura [UptimeRobot](https://uptimerobot.com) (gratuito):
1. Crea cuenta en uptimerobot.com
2. Agrega nuevo monitor:
   - **Tipo:** HTTP(s)
   - **URL:** `https://tu-url.onrender.com/api/health`
   - **Intervalo:** 5 minutos
3. Configura alertas por email/Telegram

### Verificar estado de servicios externos
```bash
curl https://tu-url.onrender.com/api/services/status
```

---

## 10. Escalamiento

### Cuando escalar

| Indicador | Accion |
|-----------|--------|
| Tiempo de respuesta > 2s | Agregar workers |
| Tasa de error > 1% | Investigar y corregir |
| CPU > 80% | Escalar instancia |
| Memoria > 512MB | Revisar memory leaks |
| Usuarios concurrentes > 100 | Plan Standard |
| Usuarios concurrentes > 500 | Plan Pro + auto-scaling |

### Como escalar en Render

**Escalar verticalmente (mas recursos):**
1. Dashboard > Tu servicio > **"Settings"**
2. Cambiar **Plan**: Free > Starter > Standard > Pro
3. Los cambios aplican en el proximo deploy

**Escalar horizontalmente (mas instancias):**
1. Dashboard > Tu servicio > **"Scaling"**
2. Configurar:
   - Min Instances: 1
   - Max Instances: 10
   - Target CPU: 70%
   - Target Memory: 80%

**Escalar workers de Gunicorn:**
Modifica el start command:
```bash
# 2 workers (bajo trafico)
gunicorn server_prod:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

# 4 workers (trafico medio)
gunicorn server_prod:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120

# 8 workers (alto trafico)
gunicorn server_prod:app --bind 0.0.0.0:$PORT --workers 8 --timeout 120
```

### Estrategia de crecimiento (del skill devops-support)

| Fase | Usuarios | Infraestructura | Costo estimado |
|------|----------|-----------------|----------------|
| 1 (Lanzamiento) | 0-1K | Render Free/Starter, localStorage | $0-7/mes |
| 2 (Crecimiento) | 1K-10K | Render Standard, PostgreSQL | $25-50/mes |
| 3 (Escala) | 10K-100K | Redis + PostgreSQL + CDN | $100-300/mes |
| 4 (Enterprise) | 100K+ | Multi-region, WebSocket, managed DB | $500+/mes |

---

## 11. Solucion de Problemas

### El deploy falla en Render

**Error: "Build failed"**
```bash
# Verificar que requirements.txt es valido
pip install -r requirements.txt

# Verificar version de Python
python --version  # Debe ser 3.11+
```

**Error: "server_prod not found"**
- Verifica que `server_prod.py` existe en la raiz del proyecto
- Verifica que tiene una variable `app` exportada (Flask app)

**Error: "Port already in use"**
```bash
# En Render, usar $PORT (Render lo asigna)
# Localmente:
lsof -i :8081  # Mac/Linux
netstat -ano | findstr :8081  # Windows

# Matar proceso
kill -9 PID  # Mac/Linux
taskkill /PID PID /F  # Windows
```

### La app carga pero las APIs fallan

**Mercado Pago devuelve 401:**
- Verifica que `MP_ACCESS_TOKEN` esta configurado en Render
- Verifica que el token no ha expirado
- Si usas sandbox, verifica que `MP_SANDBOX=true`

**SendGrid no envia emails:**
- Verifica la API key en Render
- Verifica que el sender esta verificado en SendGrid
- Revisa los logs de Render para errores especificos

**UltraMSG no envia WhatsApp:**
- Verifica instancia y token
- Verifica que la instancia esta activa en ultramsg.com

### El Service Worker no se actualiza

```javascript
// En el navegador (DevTools > Console):
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister());
});
// Luego recarga la pagina (Ctrl+Shift+R)
```

### La PWA no se puede instalar

Verifica en DevTools > Application > Manifest:
- manifest.json debe cargar sin errores
- Los iconos deben existir (192x192 y 512x512)
- `start_url` debe ser accesible
- La pagina debe servirse por HTTPS (o localhost)

### Render muestra "Service Unavailable"

1. Revisa los logs: Dashboard > Logs
2. Verifica el health check: `curl tu-url/api/health`
3. Si el free tier: el servicio se "duerme" tras 15 min de inactividad
   - Solucion: Upgrade a Starter ($7/mes) para "Always On"
   - O configura UptimeRobot para hacer ping cada 5 min

---

## 12. Procedimiento de Rollback

### Opcion 1: Rollback desde Render Dashboard (Recomendado)

1. Ve a Dashboard > Tu servicio > **"Events"**
2. Busca el deploy anterior que funcionaba
3. Click en **"Rollback to this deploy"**
4. Confirma el rollback
5. Espera 1-2 minutos
6. Verifica: `python test_deploy.py https://tu-url.onrender.com`

### Opcion 2: Rollback con Git

```bash
# Ver historial de commits
git log --oneline -10

# Revertir el ultimo commit (crea un nuevo commit de reversion)
git revert HEAD

# O revertir un commit especifico
git revert abc1234

# Push (Render desplegara automaticamente)
git push origin main
```

### Opcion 3: Deploy manual de un commit anterior

```bash
# En Render Dashboard:
# Settings > Build & Deploy > Manual Deploy
# Seleccionar el commit especifico
```

### Verificacion post-rollback

```bash
# Siempre verificar despues de un rollback
python test_deploy.py https://tu-url.onrender.com

# Verificar logs
# Dashboard > Logs (buscar errores)
```

---

## Comandos Rapidos de Referencia

```bash
# Desarrollo local
python server.py                          # Servidor dev en :8081
python test_deploy.py                     # Tests contra localhost

# Produccion local
gunicorn server_prod:app --bind 0.0.0.0:8081 --workers 2

# Tests contra produccion
python test_deploy.py https://tu-url.onrender.com

# Git workflow
git add .
git commit -m "descripcion del cambio"
git push origin main                      # Auto-deploy en Render

# Verificar estado
curl https://tu-url.onrender.com/api/health
curl https://tu-url.onrender.com/api/services/status
```

---

*Ultima actualizacion: Abril 2026*
*MiDoctorYa Lite PWA v1.0*
