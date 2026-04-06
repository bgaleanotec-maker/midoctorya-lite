# MiDoctorYa Lite — Documentacion Tecnica

> **Version:** 1.0 — PWA
> **Stack:** Python (Flask) + Vanilla JS + Tailwind CSS
> **Fecha:** Abril 2026

---

## 1. Vision General

MiDoctorYa Lite es una **Progressive Web App (PWA)** ligera que ofrece bienestar integral: fitness con GIFs 3D, nutricion con IA, manejo del estres y citas medicas. Se instala directamente en el celular como app nativa (icono en pantalla de inicio) sin pasar por Play Store ni App Store.

```
┌─────────────────────────────────────────────────────┐
│              ARQUITECTURA GENERAL                    │
│                                                      │
│   📱 PWA (Frontend)                                  │
│   ├── index.html (SPA Shell)                        │
│   ├── js/app.js (Router + Auth + Settings)          │
│   ├── js/fitness.js (Ejercicios + GIFs 3D)          │
│   ├── js/nutrition.js (Chat IA Nutricional)         │
│   ├── js/stress.js (Bienestar Mental)               │
│   ├── js/appointments.js (Citas Medicas - CO)       │
│   ├── js/api.js (Cliente REST + Cache)              │
│   ├── js/i18n.js (5 Idiomas)                        │
│   ├── sw.js (Service Worker - Offline)              │
│   └── manifest.json (Instalacion PWA)               │
│         │                                            │
│         ▼ HTTP REST                                  │
│   🐍 Backend Python (Flask)                          │
│   ├── /api/v1/fitness/external/* → ExerciseDB PRO   │
│   ├── /api/v1/stress/* → SQLite DB                  │
│   ├── /api/v1/appointments/* → SQLite DB            │
│   └── /api/v1/nutrition/analyze → Google Gemini     │
│         │                                            │
│         ▼ External APIs                              │
│   ☁️  ExerciseDB PRO (RapidAPI) — 1300+ ejercicios  │
│   ☁️  Google Gemini Vision — Analisis nutricional    │
└─────────────────────────────────────────────────────┘
```

---

## 2. Estructura de Archivos

```
lite_doctorYA/
├── index.html              ← SPA shell, splash screen, auth, install banner
├── manifest.json           ← Metadata PWA (nombre, iconos, display: standalone)
├── sw.js                   ← Service Worker (cache offline, network-first API)
├── server.py               ← Servidor Python para desarrollo (port 8080)
├── generate_icons.py       ← Generador de iconos PNG con Python puro
├── css/
│   └── app.css             ← Estilos custom (gradientes, glass, animaciones, chat)
├── js/
│   ├── app.js              ← Router principal, auth, settings, navegacion
│   ├── i18n.js             ← 5 idiomas (ES/EN/PT/FR/DE) + traduccion body parts
│   ├── api.js              ← Cliente HTTP REST con cache en memoria
│   ├── fitness.js          ← Modulo fitness (busqueda, filtros, GIFs, detalle)
│   ├── nutrition.js        ← Chat WhatsApp-style con analisis nutricional IA
│   ├── stress.js           ← Mood tracker, respiracion 4-7-8, diario, triggers
│   └── appointments.js     ← Doctores, slots, reservas (solo Colombia)
└── icons/
    ├── icon-192.png        ← Icono PWA 192x192
    └── icon-512.png        ← Icono PWA 512x512 (maskable)
```

---

## 3. Modulos del Sistema

### 3.1 Fitness (`js/fitness.js` — 320 lineas)

**Funcionalidad:**
- Selector de genero (Hombre/Mujer) con recomendaciones diferenciadas
- 10 categorias de body part con pills interactivos
- Busqueda de ejercicios con debounce (350ms)
- Cards de ejercicios con **GIFs anatomicos 3D** de ExerciseDB PRO
- Vista de detalle: GIF grande, instrucciones, series/reps, ejercicios similares
- Saludo personalizado por hora del dia

**Flujo de datos:**
```
Usuario selecciona genero/bodypart
  → api.js: getRecommendations(gender) / getExercisesByBodyPart(bp)
  → Backend: /api/v1/fitness/external/recommend
  → rapidapi_service.py: RecommendationEngine.get_daily_plan()
  → ExerciseDB PRO API (RapidAPI)
  → _enrich() agrega gifUrl via /image endpoint
  → Frontend renderiza cards con GIFs
```

**Motor de Recomendaciones (Backend):**

| Dia | Rutina | Body Parts |
|-----|--------|------------|
| Lunes | Fuerza Superior | chest, shoulders, upper arms |
| Martes | Cardio + Core | cardio, waist |
| Miercoles | Tren Inferior | upper legs, lower legs |
| Jueves | Espalda + Biceps | back, upper arms |
| Viernes | Full Body | chest, back, upper legs |
| Sabado | Cardio Activo | cardio, lower legs |
| Domingo | Descanso Activo | neck, lower arms |

**Prioridades por genero:**
- **Mujer:** upper legs > waist > back > shoulders > lower legs > cardio
- **Hombre:** chest > back > upper arms > upper legs > shoulders > cardio

**GIFs 3D:**
```
URL: https://exercisedb.p.rapidapi.com/image
  ?exerciseId={id}
  &resolution=360
  &rapidapi-key={RAPIDAPI_KEY}
```

---

### 3.2 Nutricion (`js/nutrition.js` — 142 lineas)

**Funcionalidad:**
- Chat estilo WhatsApp (burbujas usuario/bot)
- Input con textarea auto-expandible
- Indicador de "escribiendo..." con animacion bounce
- Analisis nutricional via backend (Google Gemini)
- Fallback con datos mock si API no disponible
- Formato bold (**texto**) y bullet points en respuestas

**Flujo:**
```
Usuario escribe descripcion de comida
  → api.js: analyzeFood(description)
  → Backend: POST /api/v1/nutrition/analyze
  → Google Gemini Vision
  → Respuesta: calorias, macros, recomendaciones
  → Chat muestra burbuja con analisis
```

**Mock fallback:** Si el backend no responde, genera analisis basico para arroz, pollo, ensalada y comidas genericas.

---

### 3.3 Estres (`js/stress.js` — 211 lineas)

**Funcionalidad:**
1. **Mood Tracker:** 5 niveles con emojis (Terrible → Genial)
2. **Respiracion Guiada 4-7-8:**
   - Circulo animado que escala con la fase
   - Inhalar (4s) → Mantener (7s) → Exhalar (8s)
   - Timer en tiempo real (MM:SS)
   - Registra duracion total al detener
3. **Factores de Estres:** 5 triggers seleccionables (Trabajo, Familia, Salud, Dinero, Social)
4. **Diario:** Textarea para escribir reflexiones
5. **Recomendaciones:** 3 tips de bienestar

**Endpoints:**
```
POST /api/v1/stress/mood     → {mood: 1-5, notes: "..."}
POST /api/v1/stress/breathing → {duration_seconds: N, technique: "4-7-8"}
GET  /api/v1/stress/dashboard → Estadisticas agregadas
```

---

### 3.4 Citas Medicas (`js/appointments.js` — 241 lineas)

**Disponibilidad:** Solo Colombia (country === 'CO')

**Funcionalidad:**
1. **Lista de Doctores:** Nombre, especialidad, rating, boton agendar
2. **Selector de Horarios:** 7 dias + grid de slots disponibles
3. **Mis Citas:** Lista con estado (Programada/Cancelada)
4. **Cancelar Cita:** Con confirmacion

**Endpoints:**
```
GET  /api/v1/appointments/doctors              → Lista doctores activos
GET  /api/v1/appointments/doctors/{id}/slots    → Horarios disponibles
POST /api/v1/appointments/book                  → Reservar cita
GET  /api/v1/appointments/my                    → Mis citas
PATCH /api/v1/appointments/{id}/cancel          → Cancelar cita
POST /api/v1/appointments/seed-doctors          → Sembrar datos iniciales
```

**Doctores pre-cargados:** 3 doctores (Medicina General, Cardiologia, Dermatologia) con horarios Lun-Vie 8:00-17:00, slots de 30min.

---

### 3.5 Configuracion (`js/app.js` — renderSettings)

- **Perfil:** Avatar con inicial, nombre, email, badge Premium
- **Idiomas:** 5 opciones (ES/EN/PT/FR/DE) con banderas
- **Pais:** 6 opciones (CO, US, MX, ES, BR, Otro)
  - Colombia = Todas las funciones (citas incluidas)
  - Otros = Internacional (sin citas medicas)
- **Cerrar Sesion:** Limpia localStorage y recarga

---

## 4. Sistema de Internacionalizacion

**Archivo:** `js/i18n.js` — 258 lineas, ~90 keys por idioma

| Idioma | Codigo | Bandera |
|--------|--------|---------|
| Espanol | es | 🇪🇸 |
| English | en | 🇺🇸 |
| Portugues | pt | 🇧🇷 |
| Francais | fr | 🇫🇷 |
| Deutsch | de | 🇩🇪 |

**Funciones principales:**
```javascript
t('key')           // Traduce una key al idioma actual
tBP('chest')       // Traduce body part del ingles (API) al idioma actual
getLang() / setLang('en')     // Getter/Setter idioma
getCountry() / setCountry('CO') // Getter/Setter pais
hasAppointments()  // true solo si country === 'CO'
```

**Persistencia:** `localStorage` keys `dya_lang` y `dya_country`

---

## 5. Cliente API (`js/api.js` — 135 lineas)

**Base URL:** `http://localhost:5000/api/v1`

**Cache en memoria:**
- Ejercicios/busquedas: 30 minutos (1,800,000ms)
- Body parts: 24 horas (86,400,000ms)
- Recomendaciones: 30 minutos

**14 funciones exportadas:**

| Funcion | Metodo | Endpoint | Cache |
|---------|--------|----------|-------|
| `getBodyParts()` | GET | /fitness/external/bodyparts | 24h |
| `searchExercises(q, limit)` | GET | /fitness/external/search | 30min |
| `getExercisesByBodyPart(bp)` | GET | /fitness/external/bodypart/{bp} | 30min |
| `getExerciseDetail(id)` | GET | /fitness/external/exercise/{id} | No |
| `getRecommendations(gender)` | GET | /fitness/external/recommend | 30min |
| `getSimilarByTarget(target)` | GET | /fitness/external/target/{t} | No |
| `logMood(mood, notes)` | POST | /stress/mood | No |
| `logBreathing(duration)` | POST | /stress/breathing | No |
| `getStressDashboard()` | GET | /stress/dashboard | No |
| `getDoctors()` | GET | /appointments/doctors | No |
| `getDoctorSlots(id, date)` | GET | /appointments/doctors/{id}/slots | No |
| `bookAppointment(...)` | POST | /appointments/book | No |
| `getMyAppointments()` | GET | /appointments/my | No |
| `cancelAppointment(id)` | PATCH | /appointments/{id}/cancel | No |

---

## 6. PWA — Instalacion y Offline

### manifest.json
```json
{
  "name": "MiDoctorYa",
  "short_name": "DoctorYa",
  "display": "standalone",
  "theme_color": "#6366F1",
  "background_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [192x192, 512x512 (maskable)]
}
```

### Service Worker (`sw.js`)
- **Estrategia API:** Network-first (si falla red, usa cache)
- **Estrategia Assets:** Cache-first (archivos estaticos desde cache)
- **Cache Name:** `doctorya-v1`
- **Assets cacheados:** HTML, CSS, JS (7 modulos), manifest

### Instalacion en celular
1. Abrir `http://<ip>:8080` en Chrome (Android) o Safari (iOS)
2. Menu del navegador → "Instalar app" / "Agregar a pantalla de inicio"
3. Queda con icono como cualquier app nativa (WhatsApp, etc.)
4. Se abre en modo standalone (sin barra del navegador)

### Banner de instalacion
- Se muestra automaticamente cuando el navegador detecta que es instalable
- Boton "Instalar" y "Cerrar"
- Se oculta despues de instalar o cerrar

---

## 7. Autenticacion y Flujo de Inicio

```
Splash Screen (1.5s)
  ↓
¿Logged in? (localStorage 'dya_logged')
  ├── SI → App Shell → Tab Fitness
  └── NO → Auth Screen
              ├── Login (email + password)
              ├── Registrar (nombre + email + password + confirmar)
              ├── Google / Apple (placeholders)
              └── "Explorar sin cuenta"
                    ↓
              App Shell → Tab Fitness
```

**Almacenamiento local:**
| Key | Contenido | Uso |
|-----|-----------|-----|
| `dya_logged` | '1' | Sesion activa |
| `dya_user` | JSON {name, email} | Perfil usuario |
| `dya_gender` | 'male'/'female' | Preferencia fitness |
| `dya_lang` | 'es'/'en'/... | Idioma |
| `dya_country` | 'CO'/'US'/... | Pais |
| `dya_installed` | '1' | App instalada (oculta banner) |

---

## 8. Navegacion

```
┌─────────┬──────────┬─────────┬──────────┬──────────┐
│ Fitness  │ Nutricion│ Estres  │ Citas*   │ Config   │
│    ⚡    │    🛒    │    ❤️    │    📅    │    ⚙️    │
└─────────┴──────────┴─────────┴──────────┴──────────┘
* Solo visible si pais = Colombia
```

- Bottom nav fija con backdrop blur
- Tabs dinamicos segun pais
- Loading spinner al cambiar de tab
- Scroll top al navegar

---

## 9. Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | Vanilla JavaScript (ES Modules) | ES2020+ |
| CSS | Tailwind CSS (CDN) + Custom CSS | 3.x |
| Backend | Python Flask | 3.0.3 |
| Base de datos | SQLite + SQLAlchemy | - |
| API Ejercicios | ExerciseDB PRO (RapidAPI) | - |
| API Nutricion | Google Gemini Vision | - |
| Servidor dev | Python http.server | stdlib |
| PWA | Service Worker + Manifest | W3C |

---

## 10. Ejecucion

```bash
# 1. Backend (API + Base de datos)
cd backend
pip install flask flask-cors flask-sqlalchemy flask-jwt-extended requests
python run.py
# → http://localhost:5000

# 2. Frontend (PWA)
cd lite_doctorYA
python server.py
# → http://localhost:8080

# 3. Sembrar doctores (primera vez)
curl -X POST http://localhost:5000/api/v1/appointments/seed-doctors
```

### Variables de entorno
```
RAPIDAPI_KEY=0e15f14aa4msha719348cf83dae0p190e27jsn1e203bc962f4
```

---

## 11. Despliegue en Produccion

### Opcion A: Firebase Hosting (como lampro-app)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Seleccionar directorio: lite_doctorYA
firebase deploy
```

### Opcion B: Render / Railway / Heroku
- Subir backend Flask como servicio web
- Subir frontend como sitio estatico
- Configurar CORS para el dominio de produccion

### Opcion C: VPS (DigitalOcean, AWS EC2)
```bash
# Backend con gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app

# Frontend con nginx
server {
    listen 80;
    root /var/www/lite_doctorYA;
    index index.html;
    location /api/ { proxy_pass http://localhost:5000; }
}
```

---

## 12. Seguridad

- Autenticacion por localStorage (demo) — en produccion usar JWT del backend
- CORS habilitado en backend Flask
- API key de RapidAPI en variable de entorno (no expuesta al frontend)
- Service Worker solo cachea assets estaticos, no datos sensibles
- Input sanitizado en chat de nutricion (escapeHTML)

---

## 13. Rendimiento

- **Splash screen:** 1.5s (carga minima)
- **Skeleton loading:** En todas las listas mientras cargan datos
- **Cache doble:** Frontend (Map en memoria) + Backend (dict con TTL)
- **Lazy loading:** Imagenes GIF con `loading="lazy"`
- **Debounce:** Busqueda con 350ms de espera
- **Preconnect:** DNS prefetch a CDN y APIs
- **Animaciones CSS:** Hardware-accelerated (transform, opacity)

---

*Documentacion generada para MiDoctorYa Lite PWA — Abril 2026*
