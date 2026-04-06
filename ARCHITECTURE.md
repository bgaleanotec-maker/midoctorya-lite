# MiDoctorYa Lite PWA - Architecture Document

> Version 1.0.0 | April 2026
> SWEBOK-aligned architecture for a scalable telehealth PWA serving Latin America.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [SWEBOK Alignment](#2-swebok-alignment)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Scalability Strategy](#5-scalability-strategy)
6. [Security Considerations](#6-security-considerations)
7. [Performance Budgets and Targets](#7-performance-budgets-and-targets)
8. [Technology Decisions](#8-technology-decisions)
9. [Cost Projection](#9-cost-projection)
10. [Monitoring and Observability](#10-monitoring-and-observability)

---

## 1. System Overview

```
                          +------------------+
                          |    End Users     |
                          |  (Mobile/Web)    |
                          +--------+---------+
                                   |
                          HTTPS / Service Worker
                                   |
                          +--------v---------+
                          |  Cloudflare CDN  |  (Phase 2+)
                          |  DDoS / WAF      |
                          +--------+---------+
                                   |
                 +-----------------+------------------+
                 |                                    |
        +--------v---------+              +-----------v-----------+
        |  Static Assets   |              |  Render Web Service   |
        |  index.html       |              |  (Flask + Gunicorn)   |
        |  js/, css/,       |              |                       |
        |  icons/, img/     |              |  /api/mp/*            |
        |  manifest.json    |              |  /api/sendgrid/*      |
        |  sw.js            |              |  /api/ultramsg/*      |
        +------------------+              |  /api/googlefit/*     |
                                          |  /api/emergency/*     |
                                          |  /api/services/*      |
                                          |  /api/health          |
                                          +----------+------------+
                                                     |
                          +----------+----------+----+----+-----------+
                          |          |          |         |           |
                   +------v--+ +----v-----+ +--v------+ +v--------+ +v---------+
                   | Mercado | | SendGrid | | Ultra   | | Google  | | Google   |
                   | Pago    | | (Email)  | | MSG     | | Fit     | | OAuth    |
                   | API     | |          | | (WA)    | | API     | | 2.0      |
                   +---------+ +----------+ +---------+ +---------+ +----------+
```

### Key Design Principles

- **Stateless API Gateway**: The server stores no user data; it proxies requests to external services.
- **Privacy-First**: Patient data lives in localStorage on the device. Zero server-side storage.
- **Offline-Capable**: Service Worker caches shell + assets for offline access.
- **Progressive Enhancement**: Core features work offline; connected features enhance with APIs.

---

## 2. SWEBOK Alignment

| SWEBOK Chapter | Knowledge Area | Architecture Decision | Implementation |
|---|---|---|---|
| Ch 1 | Software Requirements | PWA with offline-first capability | Service Worker, localStorage, manifest.json |
| Ch 2 | Software Design | Stateless API proxy, separation of concerns | Flask routes proxy to external APIs, no DB |
| Ch 3 | Software Construction | Vanilla JS modules, no heavy frameworks | ES modules in js/, <100KB per module |
| Ch 4 | Software Testing | Health checks, endpoint smoke tests | /api/health, test_app.py, Render health checks |
| Ch 5 | Software Maintenance | Cache versioning, feature flags, rollback | SW cache version, admin config panel |
| Ch 6 | Configuration Management | Environment-driven config, IaC | .env, render.yaml, Dockerfile |
| Ch 7 | Software Engineering Management | Phased scaling strategy | 4-phase plan from free tier to 100K+ users |
| Ch 8 | Software Engineering Process | CI/CD via Render auto-deploy | Git push triggers build + deploy |
| Ch 9 | Software Engineering Models | Component diagram, data flows | This document |
| Ch 10 | Software Quality | Performance budgets, Lighthouse targets | <3s FCP, >90 Lighthouse scores |
| Ch 11 | Software Engineering Economics | Cost-optimized tier strategy | Render free -> starter -> pro scaling |
| Ch 12 | Computing Foundations | Python + Gunicorn WSGI | Multi-worker production server |
| Ch 13 | Mathematical Foundations | Rate limiting algorithms | Token bucket per-IP rate limiter |
| Ch 14 | Engineering Foundations | Security headers, CORS, CSP | Flask middleware, X-Frame-Options, etc. |
| Ch 15 | Professional Practice | HIPAA-awareness, data privacy | Zero-server-storage, encrypted transit |

---

## 3. Component Architecture

### 3.1 Frontend PWA

```
Frontend (Browser)
+----------------------------------------------------------------+
|  index.html          - Patient portal (main app shell)         |
|  doctor.html         - Doctor/provider dashboard               |
|  admin.html          - Admin configuration panel               |
|                                                                |
|  js/                                                           |
|  +-- app.js           Core application logic                   |
|  +-- payments.js      Mercado Pago integration                 |
|  +-- wearables.js     Google Fit / BLE data collection         |
|  +-- notifications.js Push, email, WhatsApp alerts             |
|  +-- monitoring.js    Cardiac & vitals monitoring engine        |
|  +-- doctor-panel.js  Doctor-facing features                   |
|  +-- admin.js         Admin configuration                      |
|                                                                |
|  css/                 Stylesheets                               |
|  icons/               PWA icons (192px, 512px)                 |
|  img/                 App images                                |
|  sw.js                Service Worker (caching, offline)        |
|  manifest.json        PWA manifest                              |
+----------------------------------------------------------------+
```

**Data Storage (Client-Side)**:
- `localStorage`: Patient profile, vitals history, preferences, API keys
- `IndexedDB` (future): Larger datasets, offline queue
- `Cache API` (via SW): App shell, static assets

### 3.2 API Gateway (server_prod.py)

```
Flask Application
+----------------------------------------------------------------+
|  Middleware Layer                                               |
|  +-- Security headers (X-Frame-Options, CSP, etc.)             |
|  +-- CORS handling                                              |
|  +-- Rate limiting (in-memory, per-IP)                         |
|                                                                |
|  Route Groups                                                  |
|  +-- /api/mp/*            Mercado Pago proxy                   |
|  |   +-- GET  /balance                                         |
|  |   +-- GET  /payments                                        |
|  |   +-- GET  /payment-status                                  |
|  |   +-- GET  /payment/<id>                                    |
|  |   +-- POST /create-preference                               |
|  |   +-- POST /webhook                                         |
|  |                                                             |
|  +-- /api/sendgrid/*      Email proxy                          |
|  |   +-- POST /send                                            |
|  |                                                             |
|  +-- /api/ultramsg/*      WhatsApp proxy                       |
|  |   +-- POST /send                                            |
|  |                                                             |
|  +-- /api/googlefit/*     Google Fit proxy                     |
|  |   +-- POST /token                                           |
|  |   +-- GET  /data                                            |
|  |                                                             |
|  +-- /api/emergency/*     Emergency alerts                     |
|  |   +-- POST /notify                                          |
|  |                                                             |
|  +-- /api/services/*      Service health                       |
|  |   +-- GET  /status                                          |
|  |                                                             |
|  +-- /api/health          Liveness probe                       |
|                                                                |
|  Static File Serving                                           |
|  +-- /                    index.html                           |
|  +-- /<path>              All other static files               |
+----------------------------------------------------------------+
```

### 3.3 External Services

| Service | Purpose | Protocol | Auth Method |
|---|---|---|---|
| Mercado Pago | Subscription payments | REST HTTPS | Bearer token |
| SendGrid | Email notifications | REST HTTPS | Bearer API key |
| UltraMSG | WhatsApp messages | REST HTTPS | Instance + token |
| Google Fit | Wearable health data | REST HTTPS | OAuth 2.0 |
| Google OAuth | Authentication flow | REST HTTPS | Client credentials |

---

## 4. Data Flow Diagrams

### 4.1 Subscription Payment Flow

```
Patient                  PWA Frontend            API Gateway           Mercado Pago
  |                          |                       |                      |
  |  1. Select plan          |                       |                      |
  |------------------------->|                       |                      |
  |                          |  2. POST /api/mp/     |                      |
  |                          |     create-preference  |                      |
  |                          |---------------------->|                      |
  |                          |                       |  3. POST /checkout/  |
  |                          |                       |     preferences      |
  |                          |                       |--------------------->|
  |                          |                       |  4. preference_id,   |
  |                          |                       |     init_point       |
  |                          |                       |<---------------------|
  |                          |  5. Redirect URL      |                      |
  |                          |<----------------------|                      |
  |  6. Redirect to MP       |                       |                      |
  |     checkout page        |                       |                      |
  |<-------------------------|                       |                      |
  |                          |                       |                      |
  |  7. Complete payment     |                       |                      |
  |  (on MP site)            |                       |                      |
  |                          |                       |                      |
  |  8. Redirect back        |                       |                      |
  |  (?payment=success)      |                       |                      |
  |------------------------->|                       |                      |
  |                          |  9. GET /api/mp/      |                      |
  |                          |     payment-status    |                      |
  |                          |---------------------->|                      |
  |                          |                       |  10. GET /v1/        |
  |                          |                       |      payments/search |
  |                          |                       |--------------------->|
  |                          |                       |  11. Payment data    |
  |                          |                       |<---------------------|
  |                          |  12. Status confirmed |                      |
  |                          |<----------------------|                      |
  |  13. Access granted      |                       |                      |
  |<-------------------------|                       |                      |
```

### 4.2 Wearable Monitoring Flow

```
Wearable Device     Google Fit       PWA Frontend        API Gateway        Google OAuth
     |                  |                 |                    |                  |
     | 1. Sync data     |                 |                    |                  |
     |----------------->|                 |                    |                  |
     |                  |                 |                    |                  |
     |                  |  2. User clicks |                    |                  |
     |                  |  "Connect"      |                    |                  |
     |                  |                 |  3. OAuth redirect |                  |
     |                  |                 |------------------------------------------->|
     |                  |                 |                    |                  |
     |                  |                 |  4. Auth code      |                  |
     |                  |                 |<-------------------------------------------|
     |                  |                 |                    |                  |
     |                  |                 |  5. POST /api/     |                  |
     |                  |                 |  googlefit/token   |                  |
     |                  |                 |------------------>|                  |
     |                  |                 |                    | 6. Exchange code |
     |                  |                 |                    |----------------->|
     |                  |                 |                    | 7. access_token  |
     |                  |                 |                    |<-----------------|
     |                  |                 |  8. Tokens         |                  |
     |                  |                 |<------------------|                  |
     |                  |                 |                    |                  |
     |                  |                 |  9. GET /api/      |                  |
     |                  |                 |  googlefit/data    |                  |
     |                  |                 |------------------>|                  |
     |                  |                 |                    | 10. POST        |
     |                  |                 |                    | /dataset:       |
     |                  |                 |                    | aggregate       |
     |                  |                 |                    |------->|        |
     |                  |                 |                    |        | Google |
     |                  |                 |                    |        | Fit API|
     |                  |                 |                    |<-------|        |
     |                  |                 |  11. Parsed vitals |                  |
     |                  |                 |  (HR, SpO2, steps) |                  |
     |                  |                 |<------------------|                  |
     |                  |                 |                    |                  |
     |                  |                 | 12. Store in       |                  |
     |                  |                 |     localStorage   |                  |
     |                  |                 | 13. Display charts |                  |
```

### 4.3 Doctor-Patient Communication Flow

```
Patient              PWA (Patient)       API Gateway        PWA (Doctor)          Doctor
  |                       |                   |                   |                  |
  |  1. Request consult   |                   |                   |                  |
  |---------------------->|                   |                   |                  |
  |                       |  2. POST /api/    |                   |                  |
  |                       |  sendgrid/send    |                   |                  |
  |                       |  (notify doctor)  |                   |                  |
  |                       |------------------>|                   |                  |
  |                       |                   |---[SendGrid]----->| 3. Email notif   |
  |                       |                   |                   |----------------->|
  |                       |                   |                   |                  |
  |                       |  4. POST /api/    |                   |                  |
  |                       |  ultramsg/send    |                   |                  |
  |                       |  (WA reminder)    |                   |                  |
  |                       |------------------>|                   |                  |
  |                       |                   |---[UltraMSG]----->| 5. WA message    |
  |                       |                   |                   |----------------->|
  |                       |                   |                   |                  |
  |                       |                   |                   | 6. Review vitals |
  |                       |                   |                   |<-----------------|
  |                       |                   |                   |                  |
  |                       |                   |                   | 7. Send response |
  |                       |                   |                   |  (email/WA)      |
  |                       |                   |<------------------|                  |
  | 8. Receive response   |                   |                   |                  |
  |<----------------------|                   |                   |                  |
```

### 4.4 Emergency Alert Flow

```
Monitoring Engine      PWA Frontend          API Gateway          UltraMSG        Emergency Contact
      |                     |                     |                   |                  |
      | 1. Anomaly detected |                     |                   |                  |
      | (HR > 120, SpO2 <   |                     |                   |                  |
      |  90%, etc.)         |                     |                   |                  |
      |------------------->|                     |                   |                  |
      |                     | 2. Show alert UI   |                   |                  |
      |                     | 3. Vibrate device  |                   |                  |
      |                     |                     |                   |                  |
      |                     | 4. POST /api/      |                   |                  |
      |                     | emergency/notify   |                   |                  |
      |                     |------------------->|                   |                  |
      |                     |                     | 5. Log alert     |                  |
      |                     |                     |                   |                  |
      |                     |                     | 6. POST /messages|                  |
      |                     |                     |    /chat         |                  |
      |                     |                     |----------------->|                  |
      |                     |                     |                   | 7. WhatsApp msg  |
      |                     |                     |                   |----------------->|
      |                     |                     |                   |                  |
      |                     |                     | 8. Delivery      |                  |
      |                     |                     |    confirmation  |                  |
      |                     |                     |<-----------------|                  |
      |                     | 9. Result           |                   |                  |
      |                     |<-------------------|                   |                  |
      |                     |                     |                   |                  |
      |                     | 10. Update UI with  |                   |                  |
      |                     |     delivery status |                   |                  |
```

---

## 5. Scalability Strategy

### Phase 1: Free Tier (0 - 1,000 users)

| Aspect | Decision |
|---|---|
| **Hosting** | Render Free tier (750 hrs/month) |
| **Workers** | 1 Gunicorn worker |
| **CDN** | None (Render serves static + API) |
| **Database** | None (localStorage only) |
| **Monitoring** | Render dashboard + /api/health |
| **Cost** | $0/month |
| **Limitations** | Spins down after 15min inactivity, ~512MB RAM |

**Actions**:
- Deploy server_prod.py on Render free tier
- Use Service Worker caching aggressively to reduce server load
- Monitor response times via Render metrics

### Phase 2: Starter (1,000 - 10,000 users)

| Aspect | Decision |
|---|---|
| **Hosting** | Render Starter ($7/month) |
| **Workers** | 4 Gunicorn workers |
| **CDN** | Cloudflare Free (DNS proxy) |
| **Database** | None (still localStorage) |
| **Monitoring** | Render + Cloudflare analytics |
| **Cost** | ~$7 - $15/month |
| **Capacity** | Always-on, 512MB RAM, ~100 req/s |

**Actions**:
- Enable Cloudflare for static asset caching and DDoS protection
- Set Cache-Control headers for immutable assets (1 year)
- Add rate limiting to protect external API quotas
- Implement structured logging

### Phase 3: Growth (10,000 - 100,000 users)

| Aspect | Decision |
|---|---|
| **Hosting** | Render Standard ($25/month) or Pro |
| **Workers** | Auto-scale 2-10 instances |
| **CDN** | Cloudflare Pro |
| **Database** | Render PostgreSQL (for shared doctor-patient data) |
| **Cache** | Render Redis (rate limiting, sessions) |
| **Monitoring** | Datadog or Grafana Cloud free tier |
| **Cost** | ~$50 - $150/month |
| **Capacity** | ~1,000 req/s, 2GB RAM per instance |

**Actions**:
- Migrate rate limiting from in-memory to Redis
- Add PostgreSQL for appointment records, doctor-patient mappings
- Implement WebSocket for real-time doctor-patient chat
- Add background job processing for webhook handling
- Set up proper error tracking (Sentry)

### Phase 4: Scale (100,000+ users)

| Aspect | Decision |
|---|---|
| **Hosting** | Render Pro or AWS/GCP migration |
| **Workers** | Auto-scale 5-50 instances |
| **CDN** | Cloudflare Business or AWS CloudFront |
| **Database** | Managed PostgreSQL with read replicas |
| **Cache** | Redis cluster |
| **Queue** | RabbitMQ or AWS SQS for async processing |
| **Monitoring** | Full Datadog / New Relic stack |
| **Cost** | ~$500 - $2,000/month |
| **Capacity** | ~10,000 req/s |

**Actions**:
- Separate static assets to dedicated CDN origin
- Implement API versioning (/api/v2/*)
- Add database sharding strategy by country/region
- Implement HIPAA-compliant audit logging
- Consider microservice decomposition (payments, notifications, wearables)
- Multi-region deployment for latency optimization (CO, MX, AR)

---

## 6. Security Considerations

### 6.1 Transport Security

- **HTTPS Only**: Render provides automatic TLS certificates
- **HSTS**: Enforced via Cloudflare (Phase 2+)
- **Certificate Pinning**: Not implemented (unnecessary with Render managed TLS)

### 6.2 HTTP Security Headers

Applied via Flask middleware on every response:

| Header | Value | Purpose |
|---|---|---|
| X-Content-Type-Options | nosniff | Prevent MIME-type sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| Permissions-Policy | bluetooth=(self), vibrate=(self) | Restrict browser APIs |
| Cache-Control | Varies by path | API: no-store, assets: immutable |

### 6.3 CORS Policy

- **Development**: `Access-Control-Allow-Origin: *`
- **Production**: Set `ALLOWED_ORIGIN` env var to exact domain (e.g., `https://midoctorya.com`)
- **Methods**: GET, POST, OPTIONS only
- **Headers**: Content-Type, Authorization

### 6.4 Rate Limiting

| Endpoint Group | Limit | Purpose |
|---|---|---|
| MP balance/payments | 30/min per IP | Protect MP API quota |
| MP create-preference | 20/min per IP | Prevent payment spam |
| SendGrid send | 10/min per IP | Protect email quota |
| UltraMSG send | 20/min per IP | Protect WhatsApp quota |
| Emergency notify | 10/min per IP | Prevent alert fatigue |
| Google Fit data | 30/min per IP | Protect Google API quota |
| Services status | 10/min per IP | Prevent health check abuse |

### 6.5 API Key Security

- **Server-side**: All API keys stored as environment variables, never in client code
- **Client fallback**: Frontend can pass keys in requests (for admin-configured keys stored in localStorage), but server env vars take priority
- **No logging of secrets**: API keys are never written to logs

### 6.6 Data Privacy

- **Zero server storage**: No patient data is stored on the server
- **localStorage encryption**: Recommended for sensitive health data (Phase 2)
- **HIPAA awareness**: Architecture is designed to minimize PHI exposure
- **Data residency**: Render regions can be selected per LATAM regulations

---

## 7. Performance Budgets and Targets

### 7.1 Loading Performance

| Metric | Target | Measurement |
|---|---|---|
| First Contentful Paint (FCP) | < 2.0s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |

### 7.2 Asset Budgets

| Asset Type | Budget | Strategy |
|---|---|---|
| HTML (per page) | < 50KB | Semantic HTML, minimal inline CSS |
| CSS (total) | < 100KB | Single stylesheet, no frameworks |
| JS (per module) | < 100KB | ES modules, no bundler bloat |
| JS (total) | < 500KB | Lazy-load non-critical modules |
| Images (per image) | < 200KB | WebP format, responsive srcset |
| Service Worker | < 30KB | Minimal caching logic |
| Total initial load | < 1MB | Aggressive caching |

### 7.3 API Performance

| Metric | Target |
|---|---|
| API response time (p50) | < 200ms |
| API response time (p95) | < 1,000ms |
| API response time (p99) | < 3,000ms |
| Error rate | < 1% |
| Availability | > 99.5% (Phase 1), > 99.9% (Phase 3+) |

### 7.4 Lighthouse Targets

| Category | Target Score |
|---|---|
| Performance | > 90 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |
| PWA | > 90 |

---

## 8. Technology Decisions

### 8.1 Frontend

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vanilla JS (ES Modules) | Zero bundle size overhead, fastest FCP, no build step |
| Styling | Custom CSS | No framework dependency, full control, < 100KB |
| State Management | localStorage | Privacy-first, offline-capable, zero-server-storage |
| Offline Support | Service Worker | Native browser API, cache-first strategy |
| PWA Manifest | manifest.json | Installable on Android/iOS, native-like experience |

**Why not React/Vue/Angular?**
- Target users have low-end Android devices on 3G/4G networks
- Every KB matters for first load performance
- No complex state management needed (localStorage suffices)
- Avoiding build step simplifies deployment and debugging

### 8.2 Backend

| Decision | Choice | Rationale |
|---|---|---|
| Language | Python 3.11 | Ecosystem, readability, team familiarity |
| Framework | Flask 3.1 | Lightweight, well-documented, sufficient for API proxy |
| WSGI Server | Gunicorn 23.0 | Production-grade, multi-worker, battle-tested |
| HTTP Client | requests 2.32 | Simple API, connection pooling, timeout support |
| Config | python-dotenv | 12-factor app, environment-driven configuration |

**Why Flask over FastAPI?**
- All endpoints are synchronous API proxies (no async I/O benefit)
- Simpler deployment (no ASGI server needed)
- Larger ecosystem of middleware and extensions
- Lower learning curve for team maintenance

### 8.3 Infrastructure

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Render.com | Free tier, auto-deploy from Git, managed TLS, simple scaling |
| Containerization | Docker (optional) | Reproducible builds, local dev parity, Render supports both |
| IaC | render.yaml | Declarative service definition, version-controlled |
| CDN | Cloudflare (Phase 2) | Free tier, global edge, DDoS protection |
| DNS | Cloudflare | Free, fast propagation, proxy mode |

### 8.4 External Services

| Service | Why This Provider |
|---|---|
| Mercado Pago | Dominant payment platform in LATAM, COP support |
| SendGrid | Reliable transactional email, free tier (100/day) |
| UltraMSG | Simple WhatsApp Business API, no Meta approval needed |
| Google Fit | Widest wearable compatibility on Android, free API |

---

## 9. Cost Projection

### Monthly Cost by Phase (USD)

| Component | Phase 1 (Free) | Phase 2 (Starter) | Phase 3 (Growth) | Phase 4 (Scale) |
|---|---|---|---|---|
| **Render Web Service** | $0 | $7 | $25 - $85 | $85 - $500 |
| **Render PostgreSQL** | - | - | $7 - $20 | $20 - $100 |
| **Render Redis** | - | - | $0 - $10 | $10 - $50 |
| **Cloudflare** | - | $0 | $0 - $20 | $20 - $200 |
| **SendGrid** | $0 | $0 | $0 - $15 | $15 - $90 |
| **UltraMSG** | ~$6 | ~$6 | ~$13 | ~$30 |
| **Monitoring** | $0 | $0 | $0 - $15 | $15 - $100 |
| **Domain** | ~$12/yr | ~$12/yr | ~$12/yr | ~$12/yr |
| **TOTAL** | **~$1/mo** | **~$14/mo** | **~$50 - $180/mo** | **~$200 - $1,070/mo** |

### Render Pricing Tiers (Reference)

| Tier | Price | RAM | CPU | Always On | Instances |
|---|---|---|---|---|---|
| Free | $0 | 512 MB | Shared | No (spins down) | 1 |
| Starter | $7/mo | 512 MB | Shared | Yes | 1 |
| Standard | $25/mo | 2 GB | 1 vCPU | Yes | 1 |
| Pro | $85/mo | 4 GB | 2 vCPU | Yes | 1 |
| Pro+ | $175/mo | 8 GB | 4 vCPU | Yes | 1 |
| Auto-scale | Per instance | Varies | Varies | Yes | 1 - 100 |

### Break-Even Analysis

Assuming 5% conversion to premium ($5/month subscription via Mercado Pago):

| Phase | Users | Paying Users (5%) | Revenue | Cost | Net |
|---|---|---|---|---|---|
| Phase 1 | 500 | 25 | $125 | $1 | +$124 |
| Phase 2 | 5,000 | 250 | $1,250 | $14 | +$1,236 |
| Phase 3 | 50,000 | 2,500 | $12,500 | $115 | +$12,385 |
| Phase 4 | 200,000 | 10,000 | $50,000 | $635 | +$49,365 |

---

## 10. Monitoring and Observability

### 10.1 Health Checks

| Check | Endpoint | Frequency | Alert Threshold |
|---|---|---|---|
| Liveness | GET /api/health | 30s (Render) | 3 consecutive failures |
| Readiness | GET /api/health (services) | 60s | Any service down |
| External APIs | GET /api/services/status | 5min | Any service unreachable |

### 10.2 Logging Strategy

| Level | Usage | Example |
|---|---|---|
| ERROR | Unhandled exceptions, API failures | External service 5xx |
| WARNING | Emergency alerts, rate limits hit | [EMERGENCY ALERT] |
| INFO | Request/response, deployments | Gunicorn access log |
| DEBUG | Detailed tracing (dev only) | Request payloads |

**Log Format**: `%(asctime)s %(levelname)s %(message)s`
**Output**: stdout (captured by Render log aggregation)

### 10.3 Metrics to Track

| Category | Metrics |
|---|---|
| **Traffic** | Requests/sec, unique IPs/day, top endpoints |
| **Performance** | Response time (p50, p95, p99), error rate |
| **Business** | Payments created, payments completed, conversion rate |
| **Health** | Emergency alerts sent, Google Fit connections active |
| **Infrastructure** | CPU usage, memory usage, worker utilization |

### 10.4 Alerting Rules (Phase 2+)

| Condition | Severity | Action |
|---|---|---|
| Health check fails 3x | Critical | PagerDuty / SMS |
| Error rate > 5% for 5min | High | Email + Slack |
| Response time p95 > 3s | Medium | Email |
| Rate limit triggered > 100x/hr | Low | Log review |
| Emergency alert delivery failure | High | Email + SMS |

### 10.5 Observability Roadmap

| Phase | Tools |
|---|---|
| Phase 1 | Render dashboard, Gunicorn access logs, /api/health |
| Phase 2 | Cloudflare analytics, structured JSON logging |
| Phase 3 | Sentry (error tracking), Grafana Cloud (metrics), Uptime Robot |
| Phase 4 | Datadog or New Relic (full APM), custom dashboards, SLA tracking |

---

## Appendix: File Structure

```
lite_doctorYA/
+-- index.html              Patient portal
+-- doctor.html             Doctor dashboard
+-- admin.html              Admin panel
+-- manifest.json           PWA manifest
+-- sw.js                   Service Worker
+-- server.py               Development server (SimpleHTTPRequestHandler)
+-- server_prod.py          Production server (Flask + Gunicorn)
+-- requirements.txt        Python dependencies
+-- Dockerfile              Container image definition
+-- render.yaml             Render deployment blueprint
+-- Procfile                Heroku/Render process definition
+-- gunicorn.conf.py        Gunicorn configuration
+-- .env.example            Environment variable template
+-- ARCHITECTURE.md         This document
+-- js/                     JavaScript modules
+-- css/                    Stylesheets
+-- icons/                  PWA icons
+-- img/                    Images
+-- skills/                 Claude Code skill definitions
+-- test_app.py             Test suite
```
