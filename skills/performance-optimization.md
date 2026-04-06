# Skill: Performance & Scalability Optimization

## Objetivo
Optimizar el frontend y backend para soportar millones de usuarios con tiempos de carga < 3 segundos.

## Frontend Optimizations

### 1. Code Splitting
- Los modulos JS grandes (wearables 4000+ lineas, habits 100K) deben cargarse bajo demanda
- Dynamic import() para modulos no-criticos
- Critical path: app.js + CSS only

### 2. Asset Optimization
- Minificar JS/CSS para produccion
- Gzip/Brotli compression headers
- Inline critical CSS
- Lazy load images

### 3. Service Worker Strategy
- Cache-first para assets estaticos versionados
- Network-first para API calls
- Stale-while-revalidate para HTML
- Precache critical assets on install

### 4. Bundle Size Targets
- index.html: < 15KB
- app.js (critical): < 50KB minified
- Total first load: < 200KB
- Time to Interactive: < 3s on 3G

## Backend Optimizations

### 1. Production Server
- Gunicorn con workers = (2 * CPU) + 1
- Async workers (gevent/uvicorn) para I/O bound API calls
- Connection pooling para external APIs

### 2. Caching
- Cache MP payment status (5 min TTL)
- Cache Google Fit tokens (until expiry)
- ETag headers para static assets

### 3. Rate Limiting
- 100 req/min por IP para API
- 10 req/min para payment creation
- 5 req/min para emergency alerts

### 4. Security Headers
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security

## Monitoring
- Health check endpoint: /api/health
- Request logging con timing
- Error rate tracking
