# Skill: Cardiac Monitoring Engine (CYCPLUS H2)

## Objetivo
Transformar el CYCPLUS H2 en un monitor cardiaco completo con modos configurables de monitoreo para ejercicio, pre/post-cirugia, recuperacion, y uso clinico.

## Modos de Monitoreo

### 1. Reposo (rest) - Default
- Sampling: cada 15s
- Alertas: umbrales normales
- Recursos: bajo consumo

### 2. Ejercicio (exercise)
- Sub-modos: walking, running, hiit, strength, cycling, swimming
- Sampling: cada 1-2s
- Zonas HR: Z1 (50-60%), Z2 (60-70%), Z3 (70-80%), Z4 (80-90%), Z5 (90-100%)
- Calculo VO2max en tiempo real
- Deteccion de sobresfuerzo
- Recuperacion post-ejercicio (tiempo hasta HR basal)

### 3. Pre-Cirugia (pre_surgery)
- Sampling: cada 2s continuo
- Baseline cardiaco: registra 24h de datos basales
- HRV baseline para comparacion post-op
- Alertas: umbrales mas estrictos
- Reporte generado automaticamente para el cirujano

### 4. Post-Cirugia (post_surgery)
- Sampling: cada 3s continuo
- Comparacion con baseline pre-cirugia
- Deteccion de: taquicardia, bradicardia, desaturacion, arritmias nuevas
- Alerta inmediata si sale de rangos post-operatorios
- Seguimiento de recuperacion con score diario

### 5. Rehabilitacion (rehab)
- Sampling adaptativo (reposo=10s, movimiento=3s)
- Zonas seguras personalizadas por el medico
- Progresion gradual automatica
- Score de recuperacion semanal

### 6. Monitoreo Continuo 24h (continuous)
- Sampling: cada 5s
- Solo activable por medico o paciente con disclaimer
- Detecta: apnea del sueno, arritmias nocturnas, patrones anormales

## Configuracion
- Activable por: medico (sin restriccion) o paciente (con disclaimer + aceptacion)
- Niveles de alerta: bajo (solo criticos), medio (criticos + warning), alto (todo)
- Persistencia: buffers adaptados al modo (exercise=mas grande, rest=normal)

## Archivos a Modificar
- `js/wearables.js`: Agregar MONITORING_MODES, logica de modos, zonas HR, configuracion de sampling adaptativo
