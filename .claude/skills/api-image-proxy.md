# Skill: Integrar API externa con imagenes/GIFs en una PWA

## Problema
Cuando una API externa (como ExerciseDB, Unsplash, etc.) requiere API key en headers para servir imagenes, NO se puede usar la URL directamente en `<img src="">` desde el navegador porque:
1. Los headers de autenticacion no se pueden enviar con `<img src>`
2. Exponer la API key en el frontend es un riesgo de seguridad
3. CORS puede bloquear las solicitudes

## Solucion: Server-Side Image Proxy

### Patron Arquitectonico
```
Browser <img src="/api/image-proxy/ID"> --> Tu servidor --> API externa (con API key) --> GIF/imagen --> Browser
```

### Paso 1: Endpoint proxy en el servidor (Python/Flask)

```python
# En server_prod.py o equivalente

# Config
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', '')
API_HOST = 'exercisedb.p.rapidapi.com'

# Cache en memoria para no repetir llamadas
_image_cache = {}
_IMAGE_CACHE_MAX = 100

@app.route('/api/image-proxy/<item_id>')
def image_proxy(item_id):
    # 1. Validar el ID
    if not item_id or not item_id.isdigit():
        return jsonify({'error': 'Invalid ID'}), 400

    # 2. Buscar en cache
    if item_id in _image_cache:
        resp = make_response(_image_cache[item_id])
        resp.headers['Content-Type'] = 'image/gif'
        resp.headers['Cache-Control'] = 'public, max-age=604800, immutable'
        return resp

    # 3. Fetch de la API externa con headers de autenticacion
    try:
        api_resp = requests.get(
            f'https://{API_HOST}/image',
            params={'id': item_id, 'resolution': '720'},
            headers={
                'x-rapidapi-host': API_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY
            },
            timeout=30
        )
        if api_resp.status_code != 200:
            return jsonify({'error': 'Not found'}), 404

        image_data = api_resp.content

        # 4. Guardar en cache
        if len(_image_cache) >= _IMAGE_CACHE_MAX:
            oldest = next(iter(_image_cache))
            del _image_cache[oldest]
        _image_cache[item_id] = image_data

        # 5. Servir la imagen
        resp = make_response(image_data)
        resp.headers['Content-Type'] = 'image/gif'
        resp.headers['Cache-Control'] = 'public, max-age=604800, immutable'
        return resp

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Paso 2: Service Worker — cachear imagenes del proxy

Las imagenes del proxy son pesadas (GIFs ~1MB). Usar estrategia **cache-first** en el SW:

```javascript
// En sw.js — ANTES del handler general de /api/
if (url.pathname.startsWith('/api/image-proxy/')) {
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
    return;
}
```

### Paso 3: Frontend — usar rutas relativas del proxy

```javascript
// CORRECTO - usar ruta relativa del proxy
const gifUrl = '/api/image-proxy/' + exercise.id;

// En el HTML
const gifHtml = `<img src="${gifUrl}" loading="lazy"
  onerror="this.parentElement.innerHTML='<div>Fallback</div>'">`;

// IMPORTANTE: Verificar que el check incluya rutas /api/
if (gifSrc && (gifSrc.startsWith('http') || gifSrc.startsWith('/api/'))) {
    // Crear <img>
}
```

### Paso 4: API client — endpoints propios, NO URLs externas

```javascript
// MAL - apunta a API externa o localhost
const API_BASE = 'http://localhost:5000/api/v1';

// BIEN - rutas relativas que funcionan en dev y produccion
const API_BASE = '/api';

async function getExercisesByBodyPart(bp, limit = 15) {
    const resp = await fetch(`/api/exercises/bodypart/${bp}?limit=${limit}`);
    return resp.ok ? resp.json() : [];
}
```

## Checklist rapido

- [ ] API key NUNCA en el frontend, siempre en el servidor (env var)
- [ ] Proxy endpoint que recibe ID, llama API externa, devuelve imagen
- [ ] Cache en memoria del servidor (dict con limite)
- [ ] Cache-Control headers largos (7 dias para imagenes)
- [ ] Service Worker con cache-first para el proxy de imagenes
- [ ] Frontend usa rutas relativas (`/api/...`), no URLs absolutas externas
- [ ] Frontend verifica `startsWith('/api/')` ademas de `startsWith('http')`
- [ ] `onerror` en `<img>` para fallback visual (emoji, placeholder)
- [ ] `loading="lazy"` en imagenes de lista para performance
- [ ] Bumear version del SW cache al hacer cambios

## Errores comunes a evitar

1. **Usar `<img src="https://api-externa.com/image?key=XXX">`** — Expone la API key
2. **Verificar solo `startsWith('http')`** — Las rutas del proxy empiezan con `/api/`
3. **No cachear en el servidor** — Cada request llama la API externa (costoso y lento)
4. **API_BASE hardcodeado a localhost** — No funciona en produccion
5. **No manejar el SW cache** — Las imagenes pesadas se re-descargan cada vez
6. **Olvidar bumear el SW cache version** — Navegador sirve JS/CSS viejo
