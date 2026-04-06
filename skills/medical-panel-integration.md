# Skill: Medical Panel Integration for Cardiac Monitoring

## Objetivo
Agregar al portal del doctor (doctor.html) la capacidad de activar/configurar monitoreo cardiaco para sus pacientes, ver datos en tiempo real, y generar reportes.

## Nueva Pestana: "Monitoreo Cardiaco"
Agregar tab "Monitoreo" al panel del doctor con:

### 1. Lista de Pacientes Monitoreados
- Card por paciente: nombre, email, modo activo, ultimo HR, estado del dispositivo
- Indicador verde/rojo de conexion activa
- Boton "Ver Detalle" / "Configurar"

### 2. Activar Monitoreo para Paciente
- Selector de paciente (de la lista de pacientes del doctor)
- Selector de modo: Reposo, Ejercicio, Pre-Cirugia, Post-Cirugia, Rehab, Continuo 24h
- Configuracion de umbrales personalizados (override de defaults)
- Zonas HR personalizadas (basadas en edad y condicion del paciente)
- Nivel de alerta: bajo/medio/alto
- Notas clinicas del doctor
- Boton "Activar Monitoreo"

### 3. Dashboard en Tiempo Real del Paciente
- HR en vivo con grafico de ultimas 2h
- HRV (SDNN, RMSSD) con tendencia
- SpO2 si disponible via Google Fit
- Deteccion de arritmias activa
- Estado del modo actual
- Tiempo de sesion

### 4. Reportes
- Reporte pre-quirurgico: baseline de 24h con promedios, HRV, eventos
- Reporte post-quirurgico: comparacion con baseline, score de recuperacion
- Reporte de ejercicio: zonas de HR, VO2max estimado, recuperacion
- Exportar como JSON o vista de impresion

### 5. Historial de Alertas
- Timeline de alertas del paciente
- Acciones tomadas por el doctor

## Comunicacion Doctor-Paciente
- El doctor escribe una "prescripcion de monitoreo" en localStorage
- Formato: `dya_monitoring_prescription_{patient_email}`
- El wearables.js del paciente lee esta prescripcion y ajusta el modo
- Notificacion al paciente cuando el doctor activa/cambia monitoreo

## Archivos a Modificar
- `doctor.html`: Nueva pestana "Monitoreo", UI completa
