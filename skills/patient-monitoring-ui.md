# Skill: Patient Monitoring UI

## Objetivo
Crear la interfaz del paciente para activar/gestionar modos de monitoreo cardiaco con el CYCPLUS H2, incluyendo la UI de ejercicio y el panel de monitoreo quirurgico.

## Pantallas Nuevas en Wearables

### 1. Monitor de Ejercicio (Exercise Mode)
- Pantalla fullscreen al iniciar sesion de ejercicio
- Display grande: HR actual con zona de color (Z1-Z5)
- Barra de zona animada (5 colores)
- Tiempo de sesion, calorias estimadas
- VO2max estimado en tiempo real
- Boton de pausa/reanudar/detener
- Resumen al finalizar: tiempo en cada zona, HR max/min/promedio, recuperacion
- Historial de sesiones pasadas

### 2. Selector de Modo de Monitoreo
- Tarjetas con cada modo disponible:
  - Reposo (icono luna) - Default, bajo consumo
  - Ejercicio (icono rayo) - Seleccion de tipo de ejercicio
  - Pre-Cirugia (icono bisturi) - Solo si medico lo prescribio
  - Post-Cirugia (icono hospital) - Solo si medico lo prescribio
  - Rehabilitacion (icono corazon+) - Configurable
  - Continuo 24h (icono reloj) - Requiere disclaimer
- Badge de "Prescrito por Dr. X" si el medico lo activo
- Lock icon en modos que requieren prescripcion medica (desbloqueable por paciente con disclaimer extra)

### 3. Panel de Estado del Monitoreo
- Card en dashboard que muestra:
  - Modo activo con icono/color
  - Tiempo en modo actual
  - Ultimo dato (HR, variabilidad)
  - Estado: Normal / Alerta / Critico
  - Boton rapido para cambiar modo

### 4. Historial y Reportes del Paciente
- Calendario con sesiones pasadas
- Tap en dia: ver resumen (HR promedio, eventos, modo usado)
- Graficos semanales de tendencia
- Score de salud cardiovascular (0-100)

### 5. Configuracion del Paciente
- Umbral personal de zonas HR (por edad o manual)
- Activar/desactivar notificaciones por tipo
- Frecuencia de resumen (diario/semanal)

## Archivos a Modificar
- `js/wearables.js`: UI de modos, exercise mode fullscreen, selector de modos, historial
