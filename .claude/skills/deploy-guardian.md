# Skill: Deploy Guardian — Despliegue y Resiliencia

## Proposito
Proteger la integridad de la aplicacion durante despliegues, cuidar llaves API, relaciones de base de datos, y garantizar resiliencia ante caidas de servicio.

---

## 1. Proteccion de Llaves y Secretos

### Reglas Absolutas
- **NUNCA** hardcodear llaves API, tokens o PINs en el codigo fuente
- Todas las llaves van en variables de entorno (Render Dashboard > Environment)
- Los defaults en codigo deben ser cadenas vacias `''`, NUNCA valores reales
- Archivos `.env` van en `.gitignore` SIEMPRE

### Variables de Entorno Requeridas (Render)
| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `RAPIDAPI_KEY` | ExerciseDB + YouTube Search | `0e15f14...` |
| `ADMIN_PIN` | PIN administrativo | `(generar aleatorio 6+ digitos)` |
| `MERCADOPAGO_TOKEN` | Mercado Pago access token | `APP_USR-...` |
| `CORS_ORIGIN` | Dominio permitido | `https://midoctorya-lite.onrender.com` |
| `FLASK_SECRET_KEY` | Secret key de Flask | `(generar con secrets.token_hex(32))` |

### Checklist Pre-Deploy Llaves
- [ ] Ninguna llave hardcodeada en `server_prod.py` o `server.py`
- [ ] `.env` en `.gitignore`
- [ ] Variables configuradas en Render Dashboard
- [ ] Defaults vacios en codigo (`os.environ.get('KEY', '')`)
- [ ] `render.yaml` lista las variables sin valores

---

## 2. Resiliencia de Servicios

### Patron de Fallback
Si un servicio externo falla, la app debe seguir funcionando:

```
ExerciseDB API caida → Servir datos locales JSON
YouTube Search caida → Mostrar solo GIF sin video
Mercado Pago caida → Mostrar mensaje "Intentar mas tarde"
BLE desconexion → Reconexion agresiva (10 intentos + periodico)
```

### Cache en Memoria (server_prod.py)
- Imagenes de ejercicios: cache dict con limite 100 items
- Body parts list: cache 24h
- Ejercicios por parte: cache 1h

### Service Worker (sw.js)
- Assets criticos: cache-first (CSS, JS, imagenes)
- Imagenes de ejercicio: cache-first con fallback a red
- API calls: network-first con fallback a cache
- Bumpar version en cada deploy: `doctorya-vXX`

---

## 3. Base de Datos — Proteccion de Clientes

### Estado Actual
- Datos de usuario en `localStorage` del navegador (PWA)
- No hay base de datos centralizada aun

### Recomendaciones Futuras
- Implementar Supabase o PostgreSQL en Render
- Backup automatico diario
- Encriptar datos sensibles (historial medico, mediciones)
- Politica de retencion: datos de salud minimo 5 anos
- Migraciones con versionado (Alembic o similar)

### Datos Criticos a Proteger
| Dato | Nivel | Accion |
|------|-------|--------|
| Historial medico | CRITICO | Encriptar, backup, acceso restringido |
| Datos de ejercicio | MEDIO | Backup, sincronizacion |
| Preferencias UI | BAJO | localStorage suficiente |
| Tokens de pago | CRITICO | NUNCA almacenar client-side |

---

## 4. Proceso de Deploy a Render

### Pre-Deploy Checklist
1. [ ] Todas las pruebas pasan localmente
2. [ ] SW cache version bumped (`doctorya-vXX+1`)
3. [ ] No hay `console.log` de debug en produccion
4. [ ] Variables de entorno verificadas en Render
5. [ ] CORS apunta al dominio correcto
6. [ ] No hay archivos sensibles en el commit (`.env`, keys)
7. [ ] Dockerfile usa usuario non-root
8. [ ] `requirements.txt` actualizado

### Deploy Steps
```bash
git add -A
git commit -m "deploy: descripcion del cambio"
git push origin master
# Render auto-deploys desde master
```

### Post-Deploy Verificacion
1. [ ] App carga sin errores (abrir en browser)
2. [ ] Console sin errores JS criticos
3. [ ] Login funciona
4. [ ] Ejercicios cargan con GIFs
5. [ ] BLE conecta (si hay dispositivo)
6. [ ] Navegacion entre tabs funciona
7. [ ] SW actualizado (Application > Service Workers en DevTools)

---

## 5. Rollback de Emergencia

### Si el deploy falla:
1. En Render Dashboard > Deploys > seleccionar deploy anterior > "Rollback"
2. O via git: `git revert HEAD && git push`
3. NUNCA hacer `git push --force` en master

### Senales de Alerta Post-Deploy
- Error 502/503 persistente (> 2 min)
- Logs muestran crash loops
- JS console muestra errores de importacion
- GIFs no cargan (verificar RAPIDAPI_KEY)
- CORS errors en console (verificar CORS_ORIGIN)

---

## 6. Monitoreo

### Logs en Render
- Dashboard > Logs (tiempo real)
- Buscar: `ERROR`, `Exception`, `500`
- Gunicorn access log muestra todas las requests

### Metricas Clave
- Tiempo de respuesta promedio < 500ms
- Tasa de error < 1%
- Memoria < 512MB
- CPU estable (no spikes continuos)
