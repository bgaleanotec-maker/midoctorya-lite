# LEGAL_REVIEW.md — Analisis de Riesgos Legales MiDoctorYa Lite

> **Ultima actualizacion:** Abril 2026
> **Jurisdiccion:** Colombia
> **Aplicacion:** MiDoctorYa Lite PWA
> **Elaborado por:** Oficial de Cumplimiento Legal

---

## 1.1 Clasificacion Regulatoria

### Marco Normativo Aplicable

- **Decreto 4725 de 2005** — Regimen de registros sanitarios, permiso de comercializacion y vigilancia sanitaria de los dispositivos medicos para uso humano.
- **Guia INVIMA para Software como Dispositivo Medico (SaMD)** — Lineamientos para clasificacion de software que puede considerarse dispositivo medico.
- **Resolucion 4816 de 2008** — Programa Nacional de Tecnovigilancia.

### Analisis de Clasificacion

MiDoctorYa Lite **NO debe clasificarse como dispositivo medico** bajo la normativa colombiana por las siguientes razones:

1. **Finalidad declarada**: La aplicacion se presenta como plataforma de **bienestar y entrenamiento** (wellness), no como herramienta de diagnostico, tratamiento o prevencion de enfermedades.

2. **Naturaleza de los datos**: Los datos obtenidos de wearables (frecuencia cardiaca, SpO2, HRV, pasos, sueno, estres) son **estimaciones de sensores de consumo**, no mediciones clinicas realizadas con equipos calibrados y certificados.

3. **Sin prescripcion ni diagnostico**: La aplicacion no emite diagnosticos medicos, no prescribe medicamentos y no determina tratamientos.

4. **Dispositivos de entrada no certificados**: Los wearables compatibles (CicPlus H2, Colmi P17) son dispositivos de consumo, no dispositivos medicos certificados por INVIMA.

### Argumento Legal para Clasificacion como App de Bienestar

Bajo el Decreto 4725 de 2005, un **dispositivo medico** es "cualquier instrumento, aparato, maquina, software [...] destinado por el fabricante para ser empleado en seres humanos [...] con fines de diagnostico, prevencion, monitorizacion, tratamiento o alivio de una enfermedad."

MiDoctorYa se distingue porque:

- Su **finalidad declarada** es bienestar general, no diagnostico ni tratamiento.
- Los datos presentados son **orientativos y educativos**, acompanados siempre de disclaimers.
- No se comercializa con claims de eficacia medica o clinica.
- El modulo de "deteccion de arritmias" se presenta explicitamente como **estimacion** que requiere confirmacion por cardiologo con ECG de 12 derivaciones.

### Funciones que la App NUNCA Debe Realizar

Para mantener la clasificacion de bienestar y evitar ser regulada como dispositivo medico:

1. **NUNCA diagnosticar** enfermedades, condiciones o patologias.
2. **NUNCA prescribir** medicamentos, dosis o tratamientos.
3. **NUNCA reemplazar** un ECG de 12 derivaciones, oximetro certificado o cualquier equipo medico.
4. **NUNCA afirmar** que detecta arritmias con certeza clinica.
5. **NUNCA presentar** datos de wearables como "mediciones medicas" o "resultados clinicos".
6. **NUNCA emitir** alertas que sugieran un diagnostico definitivo.
7. **NUNCA sugerir** que el usuario puede dejar de consultar a un profesional de salud.
8. **NUNCA almacenar** datos como parte de una historia clinica formal.
9. **NUNCA sustituir** el llamado a servicios de emergencia (123 en Colombia).
10. **NUNCA generar** informes que aparenten ser reportes medicos oficiales.

### Recomendacion

**Mantener SIEMPRE el disclaimer de "no es dispositivo medico"** en:
- Pantalla de inicio / onboarding
- Antes de cada sesion de monitoreo con wearable
- En los resultados de analisis de datos biometricos
- En el modulo de deteccion de arritmias
- En las comunicaciones de emergencia
- En los terminos y condiciones
- En la politica de privacidad

---

## 1.2 Proteccion de Datos (Ley 1581 de 2012)

### Marco Normativo

- **Ley 1581 de 2012** — Regimen general de proteccion de datos personales.
- **Decreto 1377 de 2013** (compilado en Decreto 1074 de 2015) — Reglamentacion parcial.
- **Circular Externa 002 de 2015 SIC** — Registro Nacional de Bases de Datos.

### Tipo de Datos Recopilados

| Categoria | Datos | Clasificacion |
|-----------|-------|---------------|
| Identificacion | Nombre, email, telefono | Datos personales |
| Biometricos/Salud | Frecuencia cardiaca, SpO2, HRV, intervalos R-R, pasos, sueno, estres, temperatura corporal, presion arterial estimada | **DATOS SENSIBLES** (Art. 5, Ley 1581) |
| Uso | Habitos, nutricion, ejercicio, mood | Datos personales |
| Financieros | Datos de pago (via Mercado Pago) | Datos personales / financieros |

### Base Legal para el Tratamiento

**Consentimiento expreso del titular** (Art. 6, Ley 1581 de 2012):

- Para datos sensibles (biometricos/salud), se requiere **autorizacion previa, expresa e informada**.
- El consentimiento debe ser **especifico** para cada finalidad.
- El titular debe ser informado del **caracter facultativo** de las respuestas sobre datos sensibles.
- La app ya implementa un sistema de consentimiento por modulos (general, ejercicio, cirugia, arritmia, monitoreo continuo, proteccion de datos) con expiracion de 90 dias. **Esto es correcto y debe mantenerse.**

### Derechos ARCO del Titular

Los usuarios tienen derecho a:

1. **Acceso**: Conocer sus datos personales almacenados (actualmente en localStorage, controlado por el usuario).
2. **Rectificacion**: Actualizar o corregir datos inexactos o incompletos.
3. **Cancelacion/Supresion**: Solicitar la eliminacion de sus datos.
4. **Oposicion**: Oponerse al tratamiento de sus datos para finalidades especificas.
5. **Revocacion**: Revocar la autorizacion otorgada en cualquier momento.

**Plazo de respuesta**: Maximo 10 dias habiles para consultas, 15 dias habiles para reclamos (Art. 14 y 15, Ley 1581).

### Responsable vs Encargado del Tratamiento

| Rol | Entidad | Obligaciones |
|-----|---------|-------------- |
| **Responsable** | [RAZON_SOCIAL] (MiDoctorYa) | Define finalidades y medios del tratamiento. Garantiza derechos ARCO. Inscribe bases de datos ante SIC. |
| **Encargado** | Mercado Pago | Procesa datos de pago por cuenta del responsable. |
| **Encargado** | SendGrid (Twilio) | Procesa comunicaciones email por cuenta del responsable. |
| **Encargado** | UltraMSG | Procesa comunicaciones WhatsApp por cuenta del responsable. |
| **Encargado** | Google (Google Fit) | Procesa datos de salud via Health Bridge. |

Con cada encargado debe existir un **contrato de transmision de datos** que defina alcance, finalidades, medidas de seguridad y obligaciones.

### Transferencia Internacional de Datos

| Servicio | Pais Destino | Tipo de Datos | Base Legal |
|----------|-------------|---------------|------------|
| Google Fit | Estados Unidos | Datos biometricos | Consentimiento expreso + contrato de transmision |
| Mercado Pago | Argentina/Brasil | Datos financieros | Consentimiento expreso + contrato de transmision |
| SendGrid (Twilio) | Estados Unidos | Email, nombre | Consentimiento expreso + contrato de transmision |
| UltraMSG | Internacional | Telefono, mensajes | Consentimiento expreso + contrato de transmision |
| Google Gemini | Estados Unidos | Descripciones de alimentos | Consentimiento implicito en uso del modulo |

**Requisitos** (Art. 26, Ley 1581):
- La transferencia solo es permitida a paises con nivel adecuado de proteccion, **o** con autorizacion expresa del titular.
- Estados Unidos **no** tiene declaracion de adecuacion por la SIC, por lo que se requiere **consentimiento expreso** del titular.

### Registro de Bases de Datos ante SIC

**OBLIGATORIO**: Registrar las bases de datos en el Registro Nacional de Bases de Datos (RNBD) administrado por la SIC. Aplica para:

- Base de datos de usuarios (identificacion)
- Base de datos de datos biometricos/salud (aunque sea local, debe registrarse si hay tratamiento)
- Base de datos de pagos/suscripciones
- Base de datos de citas medicas

**Plazo**: Dentro de los 2 meses siguientes al inicio del tratamiento.

### Politica de Retencion y Eliminacion

| Tipo de Dato | Almacenamiento | Retencion | Eliminacion |
|-------------|----------------|-----------|-------------|
| Datos biometricos | localStorage (dispositivo del usuario) | Controlado por el usuario | El usuario puede borrar en cualquier momento |
| Datos de cuenta | Backend (SQLite) | Mientras dure la relacion comercial + 5 anos (tributario) | Solicitud del titular o terminacion de cuenta |
| Datos de pago | Mercado Pago | Segun politica de Mercado Pago | Solicitud ante Mercado Pago |
| Comunicaciones | SendGrid/UltraMSG | Segun politicas de cada proveedor | Solicitud ante el proveedor |
| Consentimientos | localStorage | 90 dias (renovacion automatica) | Revocacion por el titular |

---

## 1.3 Telemedicina y Ejercicio Profesional

### Marco Normativo

- **Resolucion 2654 de 2019** — Establece disposiciones para la telesalud y telemedicina.
- **Resolucion 3100 de 2019** — Habilitacion de servicios de salud.
- **Resolucion 1995 de 1999** — Manejo de la historia clinica.
- **Ley 1164 de 2007** — Talento humano en salud.

### Limites Legales del Profesional de Salud via la App

El profesional de salud que utilice MiDoctorYa como canal de comunicacion con pacientes:

1. **NO puede diagnosticar** unicamente con datos del wearable. Los datos de dispositivos de consumo no constituyen evidencia clinica suficiente.

2. **NO puede emitir ordenes medicas** basandose exclusivamente en los datos de la app. Se requiere consulta presencial o teleconsulta formal con historia clinica.

3. **DEBE remitir** al paciente a consulta presencial cuando los datos sugieran condiciones que requieren evaluacion clinica.

4. **DEBE mantener historia clinica formal** (Resolucion 1995 de 1999) independiente del registro de la app. Los datos de MiDoctorYa son complementarios, no constitutivos de historia clinica.

5. **DEBE estar habilitado** por la secretaria de salud correspondiente para prestar servicios de telemedicina (Resolucion 3100 de 2019).

### Requisitos de Telemedicina (Resolucion 2654 de 2019)

Para que las interacciones via MiDoctorYa califiquen como telemedicina:

- El prestador debe estar habilitado ante el REPS (Registro Especial de Prestadores de Servicios de Salud).
- Se requiere consentimiento informado especifico para telemedicina.
- Debe existir historia clinica formal.
- El prestador debe contar con infraestructura tecnologica adecuada.
- Se debe garantizar la confidencialidad y seguridad de la informacion.

**Recomendacion**: MiDoctorYa debe posicionarse como **plataforma de agendamiento y comunicacion**, no como prestador de servicios de telemedicina. La responsabilidad de cumplimiento de requisitos de telemedicina recae sobre el profesional de salud habilitado.

### Responsabilidad del Profesional vs Responsabilidad de la Plataforma

| Aspecto | Profesional de Salud | MiDoctorYa (Plataforma) |
|---------|---------------------|------------------------|
| Diagnostico | Responsable directo | No responsable (no diagnostica) |
| Tratamiento | Responsable directo | No responsable (no prescribe) |
| Historia clinica | Obligado a mantener | No es sistema de historia clinica |
| Consentimiento telemedicina | Debe obtenerlo | Facilita el canal |
| Habilitacion de servicios | Debe estar habilitado | No es prestador de servicios de salud |
| Datos del wearable | Debe validar con examen clinico | Solo transmite estimaciones |
| Emergencias | Debe evaluar y derivar | Disclaimer + sugerir llamar al 123 |

---

## 1.4 Comercio Electronico y Pagos

### Marco Normativo

- **Ley 1480 de 2011** — Estatuto del Consumidor.
- **Ley 527 de 1999** — Comercio electronico.
- **Estatuto Tributario** — Facturacion electronica (DIAN).

### Derecho de Retracto (Art. 47, Ley 1480 de 2011)

- El consumidor tiene **5 dias habiles** desde la entrega del producto o celebracion del contrato para ejercer el derecho de retracto.
- Aplica a compras realizadas a traves de **metodos no tradicionales** (internet, telefono).
- MiDoctorYa debe implementar un mecanismo claro para ejercer este derecho.
- Se debe devolver el dinero dentro de los **30 dias calendario** siguientes.

**Estado actual**: NO implementado. **Accion requerida**: Implementar flujo de retracto en el modulo de pagos.

### Informacion Minima Obligatoria Antes de la Compra

Segun Art. 50 de la Ley 1480, el proveedor debe informar:

1. Identidad del proveedor (NIT, razon social, direccion, telefono).
2. Caracteristicas esenciales del producto/servicio.
3. Precio total con impuestos.
4. Gastos de envio (si aplica).
5. Formas de pago disponibles.
6. Modalidades de entrega.
7. Derecho de retracto y su plazo.
8. Condiciones y politica de garantia.

### Facturacion Electronica

Segun la normativa DIAN:

- Todo vendedor de bienes o prestador de servicios debe emitir **factura electronica**.
- La factura debe cumplir requisitos del Art. 617 del Estatuto Tributario.
- Debe estar validada previamente por la DIAN.

**Estado actual**: NO implementado. **Accion requerida**: Integrar con sistema de facturacion electronica autorizado por la DIAN.

### Proteccion al Consumidor Digital

- Informacion clara y veraz sobre el servicio.
- Publicidad no enganosa.
- Garantia de servicio digital.
- Atencion de PQR (Peticiones, Quejas y Reclamos) en maximo 15 dias habiles.
- Clausula de reversibilidad del pago (Art. 51, Ley 1480) cuando el consumidor sea victima de fraude o transaccion no autorizada.

---

## 1.5 Matriz de Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigacion | Estado |
|---|--------|-------------|---------|------------|--------|
| 1 | Clasificacion como dispositivo medico por INVIMA | Media | Alto | Disclaimers exhaustivos + no diagnosticar + posicionar como bienestar | MITIGADO |
| 2 | Brecha de datos de salud | Baja | Muy Alto | localStorage (no server storage para datos biometricos) + HTTPS + consentimiento | MITIGADO |
| 3 | Diagnostico erroneo por datos de wearable | Media | Alto | Disclaimers + consentimiento + advertencia de confirmar con medico | MITIGADO |
| 4 | Fallo en deteccion de emergencia (falso negativo en arritmia) | Media | Muy Alto | Disclaimer explicito de que no reemplaza ECG ni servicios de emergencia (123) | EN REVISION |
| 5 | Incumplimiento Ley 1581 de 2012 (datos personales) | Media | Alto | Politica de privacidad + consentimiento modular + derechos ARCO | MITIGADO |
| 6 | Responsabilidad medica por interpretacion de datos | Media | Alto | Limitar a bienestar, no diagnostico + separar responsabilidad plataforma vs profesional | MITIGADO |
| 7 | Derecho de retracto no implementado (Ley 1480) | Alta | Medio | Implementar flujo de retracto dentro del modulo de pagos | PENDIENTE |
| 8 | Facturacion electronica no implementada (DIAN) | Alta | Medio | Integrar con proveedor de facturacion electronica autorizado | PENDIENTE |
| 9 | Transferencia internacional de datos sin contrato | Media | Alto | Formalizar contratos de transmision con Google, Mercado Pago, SendGrid, UltraMSG | PENDIENTE |
| 10 | Registro de bases de datos ante SIC pendiente | Media | Medio | Registrar en RNBD dentro de los 2 meses siguientes | PENDIENTE |
| 11 | Falta de habilitacion del profesional de salud | Media | Alto | Verificar habilitacion ante REPS antes de permitir telemedicina | PENDIENTE |
| 12 | Uso por menores de edad sin autorizacion | Baja | Alto | Restriccion de edad (18+) + verificacion en registro | MITIGADO |
| 13 | Publicidad enganosa sobre capacidades de la app | Baja | Alto | Revision de todo material publicitario + disclaimers | MITIGADO |
| 14 | Caida del servicio afectando monitoreo en curso | Media | Alto | Service Worker offline + advertencia de no reemplazar monitoreo medico | MITIGADO |

---

## 1.6 Recomendaciones Prioritarias

### Acciones Inmediatas (0 - 30 dias)

1. **Publicar Terminos y Condiciones y Politica de Privacidad** en la app con enlaces visibles desde todas las pantallas.

2. **Registrar las bases de datos ante la SIC** en el Registro Nacional de Bases de Datos (RNBD).

3. **Implementar mecanismo de derecho de retracto** en el modulo de pagos — boton visible y flujo claro para que el usuario ejerza este derecho dentro de los 5 dias habiles.

4. **Formalizar contratos de transmision de datos** con todos los encargados internacionales (Google, Mercado Pago, SendGrid, UltraMSG).

5. **Integrar facturacion electronica** con un proveedor autorizado por la DIAN para la emision de facturas por suscripciones.

### Acciones de Corto Plazo (30 - 90 dias)

6. **Implementar mecanismo formal de ejercicio de derechos ARCO** — formulario o canal dedicado para que los usuarios soliciten acceso, rectificacion, cancelacion u oposicion de sus datos.

7. **Verificar habilitacion de profesionales de salud** — antes de permitir que un profesional ofrezca servicios a traves de la plataforma, validar su registro en REPS.

8. **Revisar y fortalecer el sistema de alertas de emergencia** — asegurar que toda alerta incluya la instruccion clara de llamar al 123 y no genere una falsa sensacion de seguridad.

9. **Agregar consentimiento especifico para transferencia internacional de datos** — informar explicitamente al usuario que sus datos pueden ser transferidos a Estados Unidos (Google Fit, SendGrid) y Argentina/Brasil (Mercado Pago).

10. **Implementar mecanismo de eliminacion de cuenta** — permitir al usuario eliminar su cuenta y todos los datos asociados de forma completa y verificable.

### Acciones de Mediano Plazo (90 - 180 dias)

11. **Realizar auditorias periodicas de cumplimiento** — revisar trimestralmente el cumplimiento de Ley 1581, Ley 1480 y normativa de telemedicina.

12. **Designar un Oficial de Proteccion de Datos** si el volumen de datos tratados lo amerita.

13. **Obtener asesoria legal especializada** sobre la viabilidad de certificacion INVIMA para funcionalidades avanzadas (monitoreo pre/post quirurgico).

14. **Implementar programa de tecnovigilancia** (Resolucion 4816 de 2008) para reportar eventos adversos relacionados con el uso de wearables a traves de la plataforma.

15. **Revisar los disclaimers del modulo de deteccion de arritmias** con un cardiologo y un abogado especializado en salud digital para asegurar que son suficientes para mitigar responsabilidad.

---

> **Nota**: Este documento es un analisis de riesgos para uso interno. No constituye asesoria legal. Se recomienda validar con un abogado especializado en derecho de la salud digital, proteccion de datos y comercio electronico en Colombia.
