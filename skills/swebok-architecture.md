# Skill: SWEBOK-Based Architecture for Scalable Deployment

## Objetivo
Disenar la arquitectura de produccion de MiDoctorYa Lite siguiendo SWEBOK (Software Engineering Body of Knowledge) para escalar a millones de usuarios.

## Principios SWEBOK Aplicados

### 1. Software Requirements (Cap 1)
- PWA frontend (HTML/CSS/JS) — servida como static assets via CDN
- Python backend — API proxy ligero para MP, SendGrid, UltraMSG, Google Fit
- localStorage para datos del paciente (privacy-first, zero-server-storage)
- Futuro: Redis/PostgreSQL para datos compartidos doctor-paciente

### 2. Software Design (Cap 2)
- Separation of Concerns: Frontend PWA | API Gateway | External Services
- Stateless API: server.py no guarda estado, solo proxea APIs externas
- Edge-first: SW caching, offline capability
- Progressive Enhancement: funciona sin conexion, mejora con APIs

### 3. Software Construction (Cap 3)
- Modular JS (ES modules): cada feature es un archivo independiente
- No frameworks pesados (React/Vue) — vanilla JS para performance maxima
- Minificacion y bundling para produccion
- Gzip/Brotli compression

### 4. Software Testing (Cap 4)
- test_app.py existente como base
- Health checks para endpoints
- Smoke tests post-deploy

### 5. Software Maintenance (Cap 5)
- Versionado de cache (SW)
- Feature flags via admin config
- Rollback capability

### 6. Software Configuration Management (Cap 6)
- Environment variables para secrets (no hardcoded)
- render.yaml para IaC
- .env template

### 7. Software Quality (Cap 11)
- Performance budgets: <3s FCP, <100KB JS per module
- Lighthouse audit targets: >90 all categories
- Error tracking

## Arquitectura de Produccion

```
[Usuarios] → [Cloudflare CDN]
                    ↓
            [Static Assets] ← index.html, js/, css/, icons/
                    ↓
            [Render Web Service] ← server.py (Gunicorn + Flask/FastAPI)
                    ↓
            [External APIs]
            ├── Mercado Pago
            ├── SendGrid
            ├── UltraMSG
            └── Google Fit OAuth
```

## Entregables
1. `ARCHITECTURE.md` — Documento de arquitectura completo
2. Refactored `server.py` → FastAPI/Flask production-ready
3. `requirements.txt`
4. `Dockerfile`
5. `render.yaml`
6. `.env.example`
7. `gunicorn.conf.py`
