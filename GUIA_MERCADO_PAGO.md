# Guia de Configuracion de Mercado Pago - MiDoctorYa

## Requisitos Previos

- Cuenta de Mercado Pago activa (persona natural o empresa)
- Acceso al Panel de Administracion de MiDoctorYa (PIN: configurado en admin.html)

---

## Paso 1: Crear tu Aplicacion en Mercado Pago

1. Ve a **https://www.mercadopago.com.co/developers/panel/app**
2. Inicia sesion con tu cuenta de Mercado Pago
3. Haz clic en **"Crear aplicacion"**
4. Completa los datos:
   - **Nombre**: `MiDoctorYa`
   - **Modelo de integracion**: Selecciona **"Checkout Pro"**
   - **Producto a integrar**: `Checkout Pro`
   - Acepta los terminos y condiciones
5. Haz clic en **"Crear aplicacion"**

> Tu aplicacion quedara creada. Ahora necesitas obtener las credenciales.

---

## Paso 2: Obtener tus Credenciales

### Credenciales de PRUEBA (Sandbox)

1. En el panel de tu aplicacion, ve a **"Credenciales de prueba"** (o Test Credentials)
2. Copia:
   - **Public Key** — empieza con `TEST-` (ej: `TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Access Token** — empieza con `TEST-` (ej: `TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Credenciales de PRODUCCION

1. En el panel de tu aplicacion, ve a **"Credenciales de produccion"** (o Production Credentials)
2. Puede que Mercado Pago te pida completar tu perfil o verificar tu identidad antes de habilitarlas
3. Copia:
   - **Public Key** — empieza con `APP_USR-` (ej: `APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Access Token** — empieza con `APP_USR-` (ej: `APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

> **IMPORTANTE**: El Access Token es SECRETO. No lo compartas con nadie ni lo expongas publicamente.

---

## Paso 3: Configurar en el Admin de MiDoctorYa

### 3.1 — Configurar las API Keys

1. Abre el admin: `http://localhost:8081/admin.html`
2. Ingresa el PIN de administrador
3. Ve a la pestana **"API Config"**
4. Completa los campos:
   - **Mercado Pago Public Key**: Pega tu Public Key (TEST- o APP_USR-)
   - **Mercado Pago Access Token**: Pega tu Access Token (TEST- o APP_USR-)
   - **Modo Sandbox**: Dejalo ACTIVADO para pruebas iniciales
5. Haz clic en **"Guardar Configuracion"**

### 3.2 — Configurar Precios y Modo

1. Ve a la pestana **"Configuracion App"**
2. Expande la seccion **"Mercado Pago"**
3. Configura:
   - **Modo Sandbox**: Activado = modo pruebas, Desactivado = pagos reales
   - **Precio COP**: Precio en pesos colombianos (default: 50000)
   - **Precio USD**: Precio en dolares para otros paises (default: 30)
4. Haz clic en **"Probar Conexion"** para verificar que las credenciales tienen el formato correcto
5. Haz clic en **"Guardar Config Mercado Pago"**

---

## Paso 4: Crear Usuarios de Prueba

Para probar pagos sin dinero real, Mercado Pago ofrece usuarios de prueba:

1. Ve a **https://www.mercadopago.com.co/developers/panel/app** y selecciona tu app
2. Ve a la seccion **"Cuentas de prueba"** (o Test Accounts)
3. Haz clic en **"Crear cuenta de prueba"**
4. Crea **2 usuarios**:
   - **Vendedor**: selecciona "Vendedor" — este simula ser tu negocio
   - **Comprador**: selecciona "Comprador" — este simula ser tu paciente

   Cada usuario de prueba tiene:
   - Email (ej: `test_user_xxxxxxx@testuser.com`)
   - Contrasena (generada automaticamente)

> **Nota**: Tambien puedes crear usuarios de prueba via API:
> ```
> curl -X POST https://api.mercadopago.com/users/test \
>   -H "Authorization: Bearer TU_ACCESS_TOKEN_DE_PRODUCCION" \
>   -H "Content-Type: application/json" \
>   -d '{"site_id":"MCO", "description":"Comprador de prueba"}'
> ```

---

## Paso 5: Hacer una Prueba de Pago

### Flujo completo:

1. Abre la app: `http://localhost:8081`
2. Ve a la pestana **"Mas..."** > **"Citas Medicas"** (o navega directamente)
3. Selecciona un doctor y un horario
4. En el paso 3 (Confirmar), veras:
   - El resumen de la consulta
   - Un banner amarillo indicando **"MODO SANDBOX (PRUEBAS)"**
   - El boton azul **"Pagar con Mercado Pago"**
5. Haz clic en el boton de pago
6. Se abrira el checkout de Mercado Pago (en nueva ventana o widget embebido)
7. Usa las credenciales del **usuario comprador de prueba**:
   - Email del comprador de prueba
   - Contrasena del comprador de prueba

### Tarjetas de prueba para Colombia (MCO):

| Tarjeta | Numero | CVV | Vencimiento | Resultado |
|---------|--------|-----|-------------|-----------|
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | Aprobado |
| Mastercard | 5254 1336 7440 3564 | 123 | 11/25 | Aprobado |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Rechazado |

> **Tip**: Usa cualquier nombre, documento de identidad (CC) con 8 digitos, y cualquier email del usuario comprador de prueba.

### Verificar el pago:

Despues de completar el pago en la ventana de Mercado Pago:
1. Regresa a la app MiDoctorYa
2. Haz clic en **"Verificar Pago"**
3. Si el pago fue aprobado, veras la confirmacion de cita con el enlace de Jitsi Meet
4. La cita aparecera en **"Mis Citas"** con estado "Programada"

---

## Paso 6: Pasar a Produccion

Cuando estes listo para recibir pagos reales:

### 6.1 — Activar credenciales de produccion

1. En el panel de Mercado Pago Developers, ve a tu aplicacion
2. Activa las **credenciales de produccion**
3. Puede requerir:
   - Verificar tu identidad (foto de cedula)
   - Completar datos fiscales
   - Para persona natural en Colombia: RUT o NIT no es necesario, solo cedula

### 6.2 — Actualizar credenciales en el admin

1. Ve a **Admin > API Config**
2. Reemplaza las credenciales TEST por las de produccion (APP_USR-)
3. En **Configuracion App > Mercado Pago**: DESACTIVA "Modo Sandbox"
4. Guarda ambas configuraciones

### 6.3 — Configurar URLs de retorno (opcional pero recomendado)

Cuando despliegues la app a un dominio publico (ej: `midoctorya.com`), actualiza las URLs de retorno en `server.py`:

```python
'back_urls': {
    'success': 'https://tudominio.com/?payment=success',
    'failure': 'https://tudominio.com/?payment=failure',
    'pending': 'https://tudominio.com/?payment=pending'
}
```

### 6.4 — Configurar Webhook (notificaciones de pago)

Para recibir notificaciones automaticas cuando un pago cambia de estado:

1. En el panel de Mercado Pago Developers > Tu aplicacion > **Webhooks**
2. Agrega la URL: `https://tudominio.com/api/mp/webhook`
3. Selecciona los eventos: `payment`, `merchant_order`
4. Guarda

> El endpoint `/api/mp/webhook` en server.py ya esta preparado para recibir estas notificaciones.

---

## Estructura Tecnica

### Endpoints del servidor (server.py)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/mp/create-preference` | POST | Crea una preferencia de pago en MP |
| `/api/mp/payment-status` | GET | Consulta estado de pago por preference_id |
| `/api/mp/payment/{id}` | GET | Consulta un pago especifico por ID |
| `/api/mp/webhook` | POST | Recibe notificaciones IPN de MP |

### Flujo de pago

```
Usuario (appointments.js)
    |
    |-- Click "Pagar con Mercado Pago"
    |-- POST /api/mp/create-preference (server.py)
    |       |-- POST api.mercadopago.com/checkout/preferences
    |       |-- Retorna: preference_id, init_point, sandbox_init_point
    |
    |-- Carga SDK de Mercado Pago (sdk.mercadopago.com/js/v2)
    |-- Renderiza checkout embebido O abre link directo
    |-- Usuario completa pago en Mercado Pago
    |
    |-- Click "Verificar Pago"
    |-- GET /api/mp/payment-status (server.py)
    |       |-- GET api.mercadopago.com/v1/payments/search
    |       |-- Retorna: status (approved/pending/rejected)
    |
    |-- Si approved: Confirma cita + muestra enlace Jitsi
    |-- Si pending: Muestra mensaje de espera
    |-- Si rejected: Muestra error + boton reintentar
```

### Almacenamiento (localStorage)

| Key | Contenido |
|-----|-----------|
| `dya_admin_config` | API keys (MP_PUBLIC_KEY, MP_ACCESS_TOKEN, MP_SANDBOX) |
| `dya_config_mercadopago` | Precios y modo sandbox |
| `dya_appointments` | Citas con datos de pago (mpPreferenceId, mpStatus, mpPaymentId) |

---

## Preguntas Frecuentes

### Como persona natural, puedo recibir pagos?
Si. En Colombia, Mercado Pago permite a personas naturales recibir pagos. Solo necesitas tu cedula de ciudadania y una cuenta bancaria asociada a tu cuenta de Mercado Pago para retirar los fondos.

### Cuanto cobra Mercado Pago por transaccion?
En Colombia, la comision tipica es del **3.49% + $900 COP** por transaccion con tarjeta. Para otros metodos de pago (PSE, efectivo) puede variar. Consulta las tarifas actualizadas en: https://www.mercadopago.com.co/costs-section

### Cuanto tarda en llegar el dinero?
- **Tarjeta de credito**: el dinero esta disponible en tu cuenta de Mercado Pago en **14 dias** (o menos si tienes buen historial)
- **PSE/Transferencia**: generalmente **2-3 dias habiles**
- Puedes transferir de Mercado Pago a tu cuenta bancaria en 1-2 dias habiles

### Puedo cambiar los precios despues?
Si. Ve a **Admin > Configuracion App > Mercado Pago** y cambia los precios de COP y USD. Los cambios aplican inmediatamente para nuevas citas.

### Que pasa si un pago queda "pendiente"?
Algunos metodos de pago (como Efecty, Baloto) generan un voucher que el paciente paga despues. El estado sera "pending" hasta que se confirme. El paciente puede hacer clic en "Verificar Pago" despues de pagar.

### Puedo hacer reembolsos?
Si, desde tu cuenta de Mercado Pago (mercadopago.com.co > Actividad > seleccionar transaccion > Devolver dinero). Tambien se puede hacer via API.

---

## Soporte

- **Documentacion oficial**: https://www.mercadopago.com.co/developers/es/docs
- **Checkout Pro**: https://www.mercadopago.com.co/developers/es/docs/checkout-pro/landing
- **Credenciales**: https://www.mercadopago.com.co/developers/panel/app
- **Centro de ayuda**: https://www.mercadopago.com.co/ayuda
