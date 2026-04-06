# Skill: Cybersecurity Guardian — Seguridad Avanzada

## Proposito
Revisar continuamente la aplicacion para prevenir codigo malicioso, vulnerabilidades de seguridad, y proteger la informacion de los clientes.

---

## 1. Capas de Seguridad Implementadas

### Server-Side (server_prod.py)
| Control | Estado | Detalle |
|---------|--------|---------|
| CSP Headers | ✅ | Content-Security-Policy contra XSS |
| CORS Restrictivo | ✅ | Solo dominio de produccion |
| Max Content Length | ✅ | 2MB limite de upload |
| Non-root Docker | ✅ | Usuario `app` en Dockerfile |
| Archivos seguros | ✅ | Solo extensiones permitidas en static |
| Bloqueo dotfiles | ✅ | `.env`, `.git` bloqueados |
| Sin llaves hardcoded | ✅ | Todas en env vars |
| Image proxy | ✅ | API keys nunca expuestas al cliente |

### Client-Side (JS)
| Control | Estado | Detalle |
|---------|--------|---------|
| XSS Escape | ✅ | `_esc()` en datos de API en fitness.js |
| No eval() | ✅ | Ningun uso de eval en el codigo |
| API Base relativa | ✅ | `/api` no localhost |
| SW Cache versioned | ✅ | Fuerza actualizacion de assets |

---

## 2. Checklist de Auditoria de Seguridad

### Cada Sprint / Deploy
- [ ] Buscar `console.log` con datos sensibles
- [ ] Verificar que no hay llaves/tokens en el codigo fuente
- [ ] Revisar que CORS no sea `*` en produccion
- [ ] Confirmar CSP headers presentes
- [ ] Verificar que localStorage no guarda tokens de pago
- [ ] Revisar imports — no hay dependencias desconocidas
- [ ] Confirmar que Dockerfile usa non-root user
- [ ] Verificar que `.env` esta en `.gitignore`

### Cada Mes
- [ ] Actualizar dependencias (`pip list --outdated`)
- [ ] Revisar CVEs de Flask, Gunicorn, requests
- [ ] Revisar permisos de API keys (scope minimo necesario)
- [ ] Rotar ADMIN_PIN
- [ ] Verificar logs de Render por accesos sospechosos

---

## 3. Vectores de Ataque y Mitigacion

### XSS (Cross-Site Scripting)
**Riesgo**: Datos de ExerciseDB inyectados en HTML
**Mitigacion**:
- Funcion `_esc()` sanitiza todo dato externo antes de insertar en DOM
- CSP header bloquea scripts inline no autorizados
- Nunca usar `innerHTML` con datos sin sanitizar

### CSRF (Cross-Site Request Forgery)
**Riesgo**: Acciones no autorizadas via links maliciosos
**Mitigacion**:
- API es solo lectura (GET) para datos de ejercicios
- Acciones criticas (pagos) requieren token de Mercado Pago
- Futuro: implementar CSRF tokens en formularios

### Inyeccion de Datos
**Riesgo**: Parametros maliciosos en API proxy
**Mitigacion**:
- Validar que exercise IDs sean numericos
- Sanitizar parametros de busqueda (strip caracteres especiales)
- Limitar longitud de query strings

### Exposicion de Secretos
**Riesgo**: API keys visibles en codigo o network tab
**Mitigacion**:
- Proxy server-side para todas las APIs externas
- Keys solo en variables de entorno
- Network tab solo muestra `/api/exercise-image/123`, nunca la key

### Man-in-the-Middle
**Riesgo**: Interceptacion de datos en transito
**Mitigacion**:
- HTTPS forzado en Render (automatico)
- HSTS header recomendado
- BLE usa emparejamiento con cifrado

---

## 4. Proteccion de Datos de Clientes

### Datos Sensibles en la App
| Dato | Donde | Riesgo | Proteccion |
|------|-------|--------|------------|
| Nombre/Email | localStorage | Medio | Futuro: encriptar |
| Historial medico | localStorage | ALTO | Futuro: DB encriptada |
| Datos biometricos (HR) | Memoria/localStorage | ALTO | No persistir raw data |
| Token MP | Server only | CRITICO | Nunca client-side |
| Ejercicios | Cache SW | BAJO | Datos publicos |

### Reglas de Oro
1. **Minimo privilegio**: Solo acceder a datos necesarios
2. **Encriptar en reposo**: Datos sensibles encriptados en storage
3. **Encriptar en transito**: HTTPS para todo
4. **No persistir innecesariamente**: Datos biometricos solo durante sesion
5. **Derecho al olvido**: Boton para borrar todos los datos del usuario

---

## 5. Respuesta a Incidentes

### Si se detecta una brecha:
1. **Contener**: Revocar API keys comprometidas inmediatamente
2. **Evaluar**: Determinar alcance (que datos fueron expuestos)
3. **Rotar**: Generar nuevas keys y tokens
4. **Notificar**: Informar a usuarios afectados
5. **Remediar**: Parchear la vulnerabilidad
6. **Documentar**: Registro del incidente y acciones tomadas

### Comandos de Emergencia
```bash
# Revocar y regenerar API key en RapidAPI dashboard
# Cambiar en Render: Dashboard > Environment > RAPIDAPI_KEY

# Forzar logout de todos los usuarios (futuro con auth real)
# Limpiar cache del servidor: reiniciar servicio en Render

# Verificar logs por acceso no autorizado
# Render Dashboard > Logs > buscar patrones sospechosos
```

---

## 6. Dependencias Seguras

### Python (requirements.txt)
- Flask: framework web (verificar CVEs regularmente)
- Gunicorn: WSGI server (mantener actualizado)
- Requests: HTTP client (verificar versiones)
- Flask-CORS: CORS handling

### Comandos de Auditoria
```bash
# Verificar vulnerabilidades conocidas
pip audit

# Actualizar dependencias
pip install --upgrade flask gunicorn requests flask-cors

# Verificar que no hay paquetes extra instalados
pip list
```

---

## 7. Headers de Seguridad Recomendados

```python
# Ya implementados en server_prod.py
response.headers['Content-Security-Policy'] = "default-src 'self'; ..."
response.headers['X-Content-Type-Options'] = 'nosniff'
response.headers['X-Frame-Options'] = 'DENY'

# Recomendados para agregar
response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
```
