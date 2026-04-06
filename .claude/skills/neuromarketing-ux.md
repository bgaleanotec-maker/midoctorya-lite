# Skill: Neuro-UX para Apps de Fitness y Bienestar
## Basado en los principios de Jurgen Klaric y neurociencia del marketing

---

## 1. Los 3 Cerebros (Decision Framework)

El usuario decide en este orden — disena para el cerebro reptiliano PRIMERO:

| Cerebro | Decide | Trigger UX | Ejemplo |
|---------|--------|------------|---------|
| **Reptiliano** (70%) | Supervivencia, comodidad, miedo a perder | Streaks, progreso, pertenencia | "No pierdas tu racha de 12 dias" |
| **Limbico** (20%) | Emociones, estatus, placer | Celebraciones, badges, personalizacion | "Felicidades! Nuevo record personal" |
| **Neocortex** (10%) | Logica, datos, comparacion | Graficas, estadisticas, planes | "Quemaste 450 cal, 23% mas que ayer" |

**Regla de oro**: La gente NO compra lo que necesita, compra lo que la hace SENTIR. Vende la emocion, no la funcion.

---

## 2. Las 10 Reglas Neuro-UX para Fitness Apps

### 1. Primera Pantalla = Gancho Emocional
- Muestra PROGRESO, no funciones
- El usuario debe SENTIR que esta mejorando en < 3 segundos
- Anillos de progreso > Numeros planos (los circulos activan centros de recompensa)
- MAL: "Bienvenido. Selecciona una opcion"
- BIEN: "Buenos dias Maria! 🔥 12 dias de racha — Tu plan de hoy esta listo"

### 2. Anillos de Progreso = Dopamina
- Apple lo descifro con los 3 anillos (Move/Exercise/Stand)
- Circulos = completitud = dopamina
- Usa 3 metricas max en la pantalla principal
- Colores distintos por anillo: indigo (ejercicio), verde (nutricion), cyan (agua)
- Animacion de llenado al cargar la pagina (1s ease-out)

### 3. Psicologia de Racha (Loss Aversion)
- La aversion a la perdida es 2x mas fuerte que la motivacion por ganancia
- "Mantene tu racha de 12 dias" > "Sigue entrenando"
- Icono de fuego 🔥 con contador visible en Home
- Estado de alerta cuando la racha esta en riesgo
- NUNCA digas "Perdiste tu racha" — di "Nuevo comienzo! Tu puedes"

### 4. Prueba Social = Cerebro Tribal
- "Maria tambien completo este entrenamiento"
- "1,234 personas entrenaron hoy"
- Badges visibles en perfil
- Pertenencia al grupo activa el reptiliano

### 5. Psicologia del Color
- **Verde** (#10B981): Salud, seguridad, progreso positivo
- **Azul/Indigo** (#6366F1): Confianza, calma, tecnologia
- **Naranja/Ambar** (#F59E0B): Energia, urgencia, accion (CTAs)
- **Rojo** (#EF4444): SOLO para urgencia real (alertas medicas)
- **Violeta** (#8B5CF6): Premium, logros, estatus

### 6. Regla de los 3 Segundos
- Si el usuario no entiende la pantalla en 3 segundos, se va
- 1 accion principal por pantalla
- Maximo 3 opciones visibles sin scroll
- Jerarquia visual clara: titulo grande → subtitulo → contenido

### 7. Micro-celebraciones = Formacion de Habito
- Confeti al completar un entrenamiento
- Haptic feedback en logros
- Sonido sutil al marcar una meta
- Animacion de "pop" al ganar un badge
- Dopamina → Repeticion → Habito (Loop de Nir Eyal)

### 8. FOMO Saludable (Fear Of Missing Out)
- "Tu plan de hoy" crea urgencia sin ansiedad
- "3 ejercicios en 12 minutos" — numeros reducen la barrera
- "Usuarios como tu entrenan a las 6pm" — presion social sutil
- NUNCA generes ansiedad: "Llevas 3 dias sin entrenar" → "Tu cuerpo te extraña"

### 9. Personalizacion = Pertenencia
- Usa el nombre del usuario SIEMPRE
- Recuerda preferencias (horario, tipo de ejercicio)
- Saludo contextual: Buenos dias/tardes/noches
- Historial visible: "Esta semana: 3 entrenamientos"
- La personalizacion activa el sentido de pertenencia (reptiliano)

### 10. Simplicidad = Confianza
- Menos opciones = mas confianza = mas conversion
- Maximo 3 opciones por pantalla
- 4-5 tabs en navegacion (NO mas)
- Regla del pulgar: toda accion importante alcanzable en 3 toques
- Whitespace generoso (24-32px entre secciones)

---

## 3. Patrones de UI Especificos

### Home Screen (Orden de prioridad)
1. Saludo + nombre + avatar (2 lineas max)
2. Streak/racha banner (1 elemento visual)
3. Anillos de progreso del dia (3 max)
4. Quick actions (4 botones, grid 2x2 o 4 columnas)
5. Card "Tu plan de hoy" (1 CTA principal)
6. Metricas resumen (grid 2x2: HR, pasos, bienestar, dispositivo)
7. Proxima cita o acceso rapido

### Tarjetas (Cards)
- Border-radius: 16px (curvas = seguridad, confianza)
- Padding: 16-20px interior
- 1 concepto por tarjeta
- Sombra sutil (no pesada)
- Icono/emoji + titulo + dato — en ese orden

### Tipografia Emocional
- **48px+ negrita**: Numeros que importan (pasos, calorias)
- **20-24px bold**: Titulos de seccion
- **14-16px regular**: Texto body
- **10-12px**: Labels, metadata
- Nunca mezclar mas de 3 tamanos por pantalla

### Animaciones con Proposito
- Entrada: slide-up 300ms (cards apareciendo)
- Progreso: fill 1000ms ease-out (anillos llenandose)
- Celebracion: confetti 2s (al completar meta)
- Transicion: fade 200ms (entre pantallas)
- NUNCA animar sin razon — cada animacion debe comunicar algo

---

## 4. Mapa del Viaje Emocional

### Al abrir la app
Calidez (saludo) → Logro (progreso) → Direccion (plan del dia)

### Durante el entrenamiento
Enfoque (UI minimal) → Animo (barra de progreso) → Celebracion (completado)

### Despues del entrenamiento
Orgullo (resumen) → Compartir (social) → Anticipacion (plan de manana)

### Al volver despues de ausencia
Empatia (bienvenido) → Esperanza (meta pequena) → Momentum (nueva racha)

**Copy para ausencia**: "Tu cuerpo te extraña 💪 Hoy es un gran dia para volver"
**NUNCA**: "Llevas 5 dias sin entrenar" (culpa = abandono)

---

## 5. Neurocopy — Guia de Escritura

### Reglas
- **Tu** no "Usted" (cercania)
- **Voz activa**: "Completa tu entrenamiento" no "Tu entrenamiento puede ser completado"
- **Numeros**: "3 ejercicios en 12 minutos" no "Un entrenamiento corto"
- **Emocion**: "Tu mejor version", "Superate hoy", "Tu cuerpo te lo agradece"
- **Positivo**: "Mantene tu racha" no "No pierdas tu racha"
- **Contexto**: Buenos dias/tardes/noches + nombre

### Frases por Seccion
| Seccion | Frase Emocional |
|---------|----------------|
| Home | "Tu plan de hoy esta listo" |
| Streak activa | "🔥 [N] dias — Imparable!" |
| Sin streak | "Hoy es un gran dia para empezar" |
| Post-workout | "Lo lograste! Tu cuerpo te lo agradece" |
| Meta cumplida | "Nuevo logro desbloqueado 🏆" |
| Sin actividad | "Tu cuerpo te extraña. Un paso a la vez" |
| Reconexion BLE | "Reconectando tu dispositivo..." |
| Error | "Algo salio mal, intentemos de nuevo" |

---

## 6. Checklist Neuro-UX por Pantalla

Antes de publicar cualquier pantalla, verifica:

- [ ] Genera una emocion en < 3 segundos?
- [ ] La accion principal es obvia sin pensar?
- [ ] Muestra PROGRESO (no solo informacion)?
- [ ] Hay una razon para volver manana?
- [ ] Se completa la tarea principal en < 3 toques?
- [ ] Se siente personal (nombre, preferencias, historial)?
- [ ] El color apoya la emocion deseada?
- [ ] Hay whitespace suficiente (no se siente apretado)?
- [ ] Los numeros son grandes y visibles?
- [ ] El copy es positivo y en voz activa?

---

## 7. Anti-patrones (NUNCA hacer)

1. **Culpar al usuario**: "No completaste tu meta" → "Manana es una nueva oportunidad"
2. **Demasiadas opciones**: Mas de 5 en un menu = paralisis de decision
3. **Texto largo**: Nadie lee parrafos en mobile. Max 2 lineas por card
4. **Colores sin proposito**: Cada color debe significar algo consistente
5. **Animaciones sin razon**: Si no comunica, es ruido
6. **Datos sin contexto**: "450 cal" no significa nada → "450 cal - 23% de tu meta"
7. **Notificaciones genericas**: "Abre la app" → "Tu entrenamiento de las 6pm esta listo"
8. **Pantallas vacias**: Nunca "No hay datos" → "Empieza tu primer entrenamiento!"
9. **Jerga tecnica**: "VO2 max" → "Tu resistencia"
10. **Hamburger menus**: Esconden funciones. Usa bottom nav con 4-5 tabs
