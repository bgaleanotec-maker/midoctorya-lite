# Skill: Render Deployment Configuration

## Objetivo
Preparar todos los archivos necesarios para deploy en Render.com con escalabilidad.

## Archivos Requeridos

### 1. requirements.txt
- gunicorn
- flask (o fastapi + uvicorn)
- python-dotenv
- requests

### 2. Dockerfile (opcional, Render soporta native Python)
- Python 3.11 slim
- Copy project files
- Install requirements
- Expose port
- CMD gunicorn

### 3. render.yaml (Blueprint)
- Web service para API
- Static site para frontend (o servido desde mismo service)
- Environment variables
- Health check path
- Auto-scaling rules

### 4. .env.example
- MP_ACCESS_TOKEN
- MP_SANDBOX (true/false)
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL
- ULTRAMSG_INSTANCE
- ULTRAMSG_TOKEN
- GOOGLE_FIT_CLIENT_ID
- GOOGLE_FIT_CLIENT_SECRET
- ADMIN_PIN
- PORT

### 5. Procfile
- web: gunicorn server_prod:app --bind 0.0.0.0:$PORT

## Consideraciones de Escalamiento
- Render auto-scale: min 1, max 10 instances
- Stateless design — no session affinity needed
- Static assets cached by browser SW
- API calls are pass-through (no DB needed initially)
- Rate limiting on API endpoints
- CORS configuracion para dominio de produccion
