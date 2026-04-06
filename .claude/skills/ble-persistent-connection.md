# Skill: Conexion BLE persistente con auto-reconexion agresiva

## Problema
Las conexiones Bluetooth Low Energy (BLE) via Web Bluetooth API se desconectan frecuentemente por:
- Interferencia de senal
- Ahorro de energia del dispositivo
- Distancia temporal del usuario
- Cambios de estado del SO

El usuario espera que la banda/reloj se mantenga conectada mientras no diga "desconectar".

## Solucion: Auto-reconexion agresiva con backoff

### Patron clave

```javascript
let _bleDevice = null;  // Referencia al dispositivo — null = desconexion intencional

// Al conectar:
_bleDevice = device;

// Al desconectar manualmente:
_bleDevice = null;  // PRIMERO limpiar referencia
device.gatt.disconnect();  // LUEGO desconectar

// Handler de desconexion accidental:
device.addEventListener('gattserverdisconnected', function() {
    if (!_bleDevice) return; // Fue intencional, no reconectar

    // Fase 1: Backoff exponencial (10 intentos, ~70 segundos total)
    var delays = [500, 1000, 2000, 3000, 5000, 5000, 8000, 10000, 15000, 20000];
    var attempt = 0;

    function tryReconnect() {
        if (!_bleDevice) return; // Usuario desconecto mientras reintentabamos
        if (_bleDevice.gatt && _bleDevice.gatt.connected) return; // Ya reconecto

        if (attempt >= delays.length) {
            // Fase 2: Reintento periodico cada 30s indefinidamente
            setTimeout(function periodicRetry() {
                if (!_bleDevice) return;
                if (_bleDevice.gatt && _bleDevice.gatt.connected) return;
                _bleDevice.gatt.connect()
                    .then(resubscribe)
                    .catch(function() {
                        setTimeout(periodicRetry, 30000);
                    });
            }, 30000);
            return;
        }

        showToast('Reconectando... (' + (attempt+1) + '/' + delays.length + ')');

        _bleDevice.gatt.connect()
            .then(resubscribe)
            .then(function() { showToast('Reconectado!'); })
            .catch(function() {
                attempt++;
                setTimeout(tryReconnect, delays[Math.min(attempt, delays.length-1)]);
            });
    }

    setTimeout(tryReconnect, delays[0]);
});
```

### Funcion resubscribe

Despues de reconectar GATT, hay que re-suscribirse a las notificaciones:

```javascript
function resubscribe(server) {
    _bleServer = server;
    return server.getPrimaryService(0x180D)  // Heart Rate
        .then(function(service) {
            return service.getCharacteristic(0x2A37);  // HR Measurement
        })
        .then(function(char) {
            _hrCharacteristic = char;
            return char.startNotifications();
        })
        .then(function() {
            _hrCharacteristic.addEventListener('characteristicvaluechanged', onHRChanged);
        });
}
```

## Reglas importantes

1. **`_bleDevice = null` controla la intencion** — Si es null, fue el usuario quien desconecto
2. **Limpiar referencia ANTES de disconnect()** — Asi el handler sabe que fue intencional
3. **No abandonar nunca** — Fase 1 (backoff) + Fase 2 (periodico) = reconexion indefinida
4. **Re-suscribir notificaciones** — Reconectar GATT no restaura las suscripciones automaticamente
5. **Toasts informativos** — El usuario debe saber que se esta reconectando
6. **No mostrar toast en cada intento** — Solo cada 3 intentos para no molestar
