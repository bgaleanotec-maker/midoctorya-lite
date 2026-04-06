# Skill: DevOps & Support Operations

## Objetivo
Skills operacionales para soporte continuo de MiDoctorYa en produccion.

## Runbooks

### Deploy
1. Push to main branch
2. Render auto-deploys
3. Verify health check
4. Check /api/health response
5. Verify SW update (cache version)

### Rollback
1. Render dashboard > Deploys > Rollback to previous
2. Or: git revert + push

### Monitoring
- Render metrics dashboard
- /api/health endpoint
- External uptime monitor (UptimeRobot free tier)

### Incident Response
1. Check Render logs
2. Check /api/health
3. Check external APIs (MP, SendGrid, UltraMSG)
4. Scale up if needed (Render dashboard)

### Scaling Triggers
- Response time > 2s: add worker
- Error rate > 1%: investigate
- CPU > 80%: scale up instance
- Memory > 512MB: check for leaks

## Database Strategy (Future)
- Phase 1 (now): localStorage only — zero server cost
- Phase 2 (1K+ users): Render PostgreSQL for doctor-patient shared data
- Phase 3 (10K+ users): Redis cache + PostgreSQL + CDN
- Phase 4 (100K+): Managed DB, multiple regions, WebSocket for real-time

## Cost Estimation (Render)
- Free tier: 1 web service, 750h/month (sufficient for launch)
- Starter ($7/mo): Always on, custom domain, SSL
- Standard ($25/mo): More RAM, better performance
- Pro: Auto-scaling, multiple instances
