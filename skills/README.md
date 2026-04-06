# Indice de Skills del Equipo - MiDoctorYa Lite

## Descripcion

Este directorio contiene los skills (habilidades especializadas) del equipo de desarrollo de MiDoctorYa Lite PWA. Cada skill define el conocimiento, procedimientos y archivos relacionados con un area especifica del proyecto.

## Skills Disponibles

| Skill | Descripcion | Archivos Principales | Estado |
|-------|-------------|---------------------|--------|
| **cardiac-monitoring-engine.md** | Motor de monitoreo cardiaco con CYCPLUS H2. Modos configurables para ejercicio, pre/post-cirugia, recuperacion y uso clinico. | `js/wearables.js`, `js/app.js` | Activo |
| **medical-panel-integration.md** | Integracion del panel medico para monitoreo cardiaco. Permite al doctor activar/configurar monitoreo, ver datos en tiempo real y generar reportes. | `doctor.html`, `js/app.js` | Activo |
| **legal-disclaimers.md** | Marco legal y disclaimers. Implementacion del marco legal completo para cumplir normativa colombiana y latinoamericana. | `index.html`, `admin.html`, `doctor.html` | Activo |
| **patient-monitoring-ui.md** | Interfaz de monitoreo del paciente. UI para activar/gestionar modos de monitoreo cardiaco, incluyendo ejercicio y panel quirurgico. | `index.html`, `js/app.js`, `css/app.css` | Activo |
| **swebok-architecture.md** | Arquitectura basada en SWEBOK para despliegue escalable. Diseno de la arquitectura de produccion para escalar a millones de usuarios. | `server.py`, `render.yaml`, `Dockerfile` | Activo |
| **render-deployment.md** | Configuracion de despliegue en Render. Preparacion de todos los archivos necesarios para deploy en Render.com con escalabilidad. | `render.yaml`, `Procfile`, `Dockerfile`, `requirements.txt` | Activo |
| **performance-optimization.md** | Optimizacion de rendimiento y escalabilidad. Frontend y backend optimizados para soportar millones de usuarios con tiempos de carga < 3s. | `sw.js`, `js/app.js`, `css/app.css`, `server.py` | Activo |
| **devops-support.md** | Operaciones DevOps y soporte. Runbooks para deploy, rollback, monitoreo, respuesta a incidentes y estrategia de escalamiento. | `test_deploy.py`, `render.yaml`, `.gitignore` | Activo |

## Como Usar los Skills

Cada skill se puede invocar como contexto para Claude Code durante el desarrollo:

```
READ skills/nombre-del-skill.md
```

### Ejemplo de uso:

```
# Para trabajar en monitoreo cardiaco:
READ skills/cardiac-monitoring-engine.md

# Para configurar el despliegue:
READ skills/render-deployment.md

# Para resolver incidentes en produccion:
READ skills/devops-support.md
```

## Agregar Nuevos Skills

Para agregar un nuevo skill:

1. Crear archivo `.md` en este directorio
2. Seguir la estructura: Objetivo, Contexto, Implementacion, Archivos
3. Actualizar esta tabla con el nuevo skill
4. Hacer commit y push

## Estructura de un Skill

```markdown
# Skill: Nombre del Skill

## Objetivo
Descripcion clara del objetivo.

## Contexto
Informacion relevante y dependencias.

## Implementacion
Pasos detallados y codigo.

## Archivos Modificados
Lista de archivos que este skill crea o modifica.
```

---

*MiDoctorYa Lite PWA - Equipo de Desarrollo*
*Ultima actualizacion: Abril 2026*
