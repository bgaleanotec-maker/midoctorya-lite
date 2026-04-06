# Skill: Legal Framework & Disclaimers

## Objetivo
Implementar el marco legal completo para proteger a MiDoctorYa y a los usuarios, cumpliendo normativa colombiana y latinoamericana.

## Disclaimers Requeridos

### 1. Disclaimer Principal (al activar monitoreo)
"AVISO IMPORTANTE: MiDoctorYa es una herramienta de bienestar y entrenamiento. NO es un dispositivo medico certificado ni reemplaza equipos medicos especializados (ECG de 12 derivaciones, oximetros certificados, monitores de grado hospitalario). Los datos proporcionados son estimaciones basadas en sensores de consumo y algoritmos de software. En caso de emergencia, contacte a servicios medicos de emergencia (123 en Colombia). Consulte siempre a un profesional de salud para diagnosticos y decisiones medicas."

### 2. Disclaimer de Ejercicio
"Las zonas de frecuencia cardiaca y recomendaciones de ejercicio son guias generales. Si tiene condiciones cardiacas, hipertension, diabetes u otra condicion cronica, consulte a su medico antes de iniciar cualquier programa de ejercicio. Detenga el ejercicio inmediatamente si siente dolor en el pecho, mareo, nauseas o dificultad para respirar."

### 3. Disclaimer de Monitoreo Quirurgico
"El monitoreo pre y post-quirurgico proporcionado por MiDoctorYa es complementario y NO sustituye el monitoreo clinico profesional. Los datos deben ser interpretados por un profesional de salud calificado. Este sistema no esta certificado por INVIMA, FDA ni ningun organismo regulador como dispositivo medico."

### 4. Disclaimer de Arritmias
"La deteccion de arritmias es una estimacion basada en variabilidad de intervalos R-R de un sensor de frecuencia cardiaca optica/banda de pecho. NO equivale a un electrocardiograma (ECG/EKG). Puede generar falsos positivos y falsos negativos. Cualquier deteccion sospechosa debe ser confirmada por un cardiologo con un ECG de 12 derivaciones."

### 5. Consentimiento Informado (aceptacion requerida)
- Checkbox obligatorio antes de activar monitoreo avanzado
- Texto: "Entiendo que MiDoctorYa es una herramienta de bienestar y entrenamiento, no un dispositivo medico. Acepto que los datos son estimaciones y no diagnosticos. Me comprometo a buscar atencion medica profesional ante cualquier sintoma preocupante."
- Se guarda timestamp y hash del consentimiento en localStorage
- Se requiere re-aceptacion cada 90 dias

### 6. Ley 1581 de 2012 (Proteccion de Datos - Colombia)
- Clausula de tratamiento de datos de salud (datos sensibles)
- Autorizacion expresa para recopilacion de datos biometricos
- Derecho a revocar autorizacion
- Datos almacenados localmente (no se envian a servidores externos sin autorizacion)

## Implementacion
- Modal de consentimiento con scroll obligatorio
- No se puede activar ningun modo avanzado sin aceptar
- Banner permanente en la UI recordando que no es dispositivo medico
- Texto legal accesible desde menu de configuracion

## Archivos a Modificar
- `js/wearables.js`: Sistema de consentimiento, validacion antes de activar modos, banners de disclaimer
- `doctor.html`: Disclaimer para medicos al activar monitoreo remoto
