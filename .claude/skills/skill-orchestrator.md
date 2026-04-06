# Skill: Skill Orchestrator — Manager y Owner Experto

## Proposito
Orquestar, controlar y verificar todos los skills de la aplicacion MiDoctorYa Lite. Actua como el "owner" experto que garantiza coherencia, calidad y alineacion entre todos los componentes.

---

## 1. Inventario de Skills

| Skill | Archivo | Responsabilidad | Prioridad |
|-------|---------|-----------------|-----------|
| **Neuro-UX** | `neuromarketing-ux.md` | Diseno emocional, UI/UX basada en neurociencia | ALTA |
| **Deploy Guardian** | `deploy-guardian.md` | Despliegues seguros, proteccion de llaves, resiliencia | CRITICA |
| **Cybersecurity** | `cybersecurity-guardian.md` | Seguridad, prevencion de ataques, proteccion de datos | CRITICA |
| **API Image Proxy** | `api-image-proxy.md` | Patron proxy para imagenes de APIs externas | MEDIA |
| **BLE Connection** | `ble-persistent-connection.md` | Reconexion agresiva de dispositivos BLE | MEDIA |
| **Skill Orchestrator** | `skill-orchestrator.md` | Este documento — coordinacion general | MAXIMA |

---

## 2. Jerarquia de Decisiones

```
Skill Orchestrator (Owner)
├── Cybersecurity Guardian (Veto power en seguridad)
├── Deploy Guardian (Gate keeper de produccion)
├── Neuro-UX (Direccion de diseno)
├── API Image Proxy (Patron tecnico)
└── BLE Connection (Patron tecnico)
```

### Reglas de Precedencia
1. **Seguridad SIEMPRE gana**: Si Cybersecurity dice NO, se detiene
2. **Deploy Guardian valida** antes de cada push a produccion
3. **Neuro-UX guia** el diseno pero no override seguridad
4. Skills tecnicos (API Proxy, BLE) son implementaciones, no politicas

---

## 3. Flujo de Trabajo por Feature

### Antes de Codificar
1. Consultar **Neuro-UX**: Como debe sentirse esta feature?
2. Consultar **Cybersecurity**: Hay riesgos de seguridad?
3. Definir criterios de aceptacion

### Durante Desarrollo
1. Seguir patrones de **API Proxy** y **BLE** si aplican
2. Sanitizar todos los datos externos (XSS)
3. No hardcodear secretos

### Antes de Deploy
1. **Cybersecurity checklist** completa
2. **Deploy Guardian checklist** completa
3. SW cache version bumped
4. Pruebas manuales pasadas

### Post-Deploy
1. Verificacion de produccion (Deploy Guardian)
2. Monitoreo de logs (Cybersecurity)
3. UX coherente con Neuro-UX principles

---

## 4. Checklist del Orchestrator

### Por Cada Cambio Significativo
- [ ] El cambio sigue los principios de Neuro-UX?
- [ ] Pasa el checklist de Cybersecurity?
- [ ] Pasa el checklist de Deploy Guardian?
- [ ] El codigo es consistente con patrones existentes?
- [ ] No hay regresiones en funcionalidad existente?
- [ ] El SW cache fue bumped si hay cambios en assets?

### Semanal
- [ ] Revisar que todos los skills estan actualizados
- [ ] Verificar que no hay drift entre skills y codigo real
- [ ] Actualizar inventario si hay nuevos skills
- [ ] Revisar metricas de produccion

### Mensual
- [ ] Auditoria completa de seguridad (Cybersecurity)
- [ ] Revision de dependencias (Deploy Guardian)
- [ ] Evaluacion de UX con usuarios reales (Neuro-UX)
- [ ] Actualizar skills con aprendizajes nuevos

---

## 5. Patrones de Calidad

### Codigo
- Funciones pequenas (< 50 lineas idealmente)
- Nombres descriptivos en ingles para codigo, espanol para UI
- Comentarios para logica compleja
- Sin `console.log` de debug en produccion
- Manejo de errores con fallback graceful

### UI/UX (delegado a Neuro-UX)
- 3-second rule: usuario entiende la pantalla inmediatamente
- Progreso visible siempre
- Maximo 3 opciones por pantalla
- Celebraciones en logros
- Copy positivo y personal

### Seguridad (delegado a Cybersecurity)
- Escape de datos externos
- Proxy para APIs con keys
- HTTPS, CSP, CORS restrictivo
- Non-root containers
- Variables de entorno para secretos

### Deploy (delegado a Deploy Guardian)
- Checklist pre-deploy obligatorio
- Verificacion post-deploy obligatoria
- Rollback plan definido
- Cache invalidation (SW version bump)

---

## 6. Resolucion de Conflictos

### Cuando dos skills se contradicen:
1. **Seguridad vs UX**: Seguridad gana. Buscar alternativa UX segura
2. **Performance vs UX**: Balancear. Animaciones si, pero optimizadas
3. **Simplicidad vs Features**: Simplicidad gana (regla Neuro-UX)
4. **Velocidad de deploy vs Calidad**: Calidad gana. No saltear checklists

### Escalacion
Si no se puede resolver:
1. Documentar el conflicto
2. Evaluar impacto al usuario
3. Priorizar proteccion del usuario (datos, experiencia)
4. Implementar la opcion mas conservadora
5. Iterar con feedback real

---

## 7. Metricas de Exito

### Tecnicas
- Uptime > 99.5%
- Tiempo de carga < 3s
- Zero vulnerabilidades criticas
- Deploy exitoso > 95% de las veces

### UX (Neuro-UX)
- Retencion dia 7 > 40%
- Sesion promedio > 3 minutos
- Tasa de completacion de ejercicios > 60%
- NPS > 50

### Negocio
- Conversion free→premium > 5%
- Churn mensual < 10%
- Costo por usuario activo < $0.50/mes
