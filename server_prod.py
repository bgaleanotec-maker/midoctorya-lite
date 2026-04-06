"""
server_prod.py -- Production Flask server for MiDoctorYa Lite PWA
Run directly:  python server_prod.py
Production:    gunicorn server_prod:app --config gunicorn.conf.py
"""

import os
import json
import time
import logging
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, make_response
from dotenv import load_dotenv
import requests as http_requests  # avoid shadowing flask.request

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max request body

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
app.config['MP_ACCESS_TOKEN'] = os.getenv('MP_ACCESS_TOKEN', '')
app.config['MP_SANDBOX'] = os.getenv('MP_SANDBOX', 'true').lower() == 'true'
app.config['SENDGRID_API_KEY'] = os.getenv('SENDGRID_API_KEY', '')
app.config['SENDGRID_FROM_EMAIL'] = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@midoctorya.com')
app.config['ULTRAMSG_INSTANCE'] = os.getenv('ULTRAMSG_INSTANCE', '')
app.config['ULTRAMSG_TOKEN'] = os.getenv('ULTRAMSG_TOKEN', '')
app.config['GOOGLE_FIT_CLIENT_ID'] = os.getenv('GOOGLE_FIT_CLIENT_ID', '')
app.config['GOOGLE_FIT_CLIENT_SECRET'] = os.getenv('GOOGLE_FIT_CLIENT_SECRET', '')
app.config['ADMIN_PIN'] = os.getenv('ADMIN_PIN', '')  # MUST be set via env var
app.config['RAPIDAPI_KEY'] = os.getenv('RAPIDAPI_KEY', '')

MP_API_BASE = 'https://api.mercadopago.com'
EXERCISEDB_HOST = 'exercisedb.p.rapidapi.com'

# In-memory cache for exercise images (exercise_id -> bytes)
_image_cache = {}
_IMAGE_CACHE_MAX = 100  # max cached images

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiting (simple in-memory)
# ---------------------------------------------------------------------------
_rate_limits = {}


def rate_limit(max_per_minute=60):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr
            now = time.time()
            key = f'{f.__name__}:{ip}'
            times = _rate_limits.get(key, [])
            times = [t for t in times if now - t < 60]
            if len(times) >= max_per_minute:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            times.append(now)
            _rate_limits[key] = times
            return f(*args, **kwargs)
        return wrapper
    return decorator


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'bluetooth=(self), vibrate=(self)'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.tailwindcss.com https://sdk.mercadopago.com 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://api.mercadopago.com https://api.sendgrid.com https://exercisedb.p.rapidapi.com; "
        "frame-src https://www.mercadopago.com.co https://www.mercadopago.com; "
        "font-src 'self' data:;"
    )
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    elif request.path.endswith(('.js', '.css', '.png', '.jpg', '.webp')):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        response.headers['Cache-Control'] = 'no-cache'
    return response


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
@app.after_request
def cors(response):
    origin = os.getenv('ALLOWED_ORIGIN', 'https://midoctorya-lite.onrender.com')
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Service-Worker-Allowed'] = '/'
    return response


# ---------------------------------------------------------------------------
# Helper: resolve access token from query param or env config
# ---------------------------------------------------------------------------
def _get_access_token(param_value=None):
    """Return access_token from the provided param or fall back to env config."""
    if param_value:
        return param_value
    return app.config['MP_ACCESS_TOKEN']


# ===========================================================================
# Static file serving
# ===========================================================================
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/admin.html')
def admin():
    return send_from_directory('.', 'admin.html')


@app.route('/doctor.html')
def doctor():
    return send_from_directory('.', 'doctor.html')


@app.route('/<path:path>')
def static_files(path):
    import re
    # Block dotfiles (.env, .git, .claude, etc.) and sensitive files
    if any(part.startswith('.') for part in path.split('/')):
        return 'Not found', 404
    SAFE_EXT = re.compile(r'\.(html|js|css|json|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|webmanifest)$', re.I)
    BLOCKED_FILES = {'server.py', 'server_prod.py', 'gunicorn.conf.py', 'requirements.txt',
                     'Dockerfile', 'render.yaml', 'docker-compose.yml', 'googlefit_config.json'}
    if path in BLOCKED_FILES or not SAFE_EXT.search(path):
        return 'Not found', 404
    return send_from_directory('.', path)


# ===========================================================================
# Health check
# ===========================================================================
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'services': {
            'mercadopago': bool(app.config['MP_ACCESS_TOKEN']),
            'sendgrid': bool(app.config['SENDGRID_API_KEY']),
            'ultramsg': bool(app.config['ULTRAMSG_INSTANCE']),
            'googlefit': bool(app.config['GOOGLE_FIT_CLIENT_ID'])
        }
    })


# ===========================================================================
# Mercado Pago endpoints
# ===========================================================================
@app.route('/api/mp/balance')
@rate_limit(max_per_minute=30)
def mp_balance():
    """GET /api/mp/balance?access_token=YYY -- Fetch MP account balance info."""
    try:
        access_token = _get_access_token(request.args.get('access_token'))
        if not access_token:
            return jsonify({'error': 'access_token es requerido'}), 400

        resp = http_requests.get(
            MP_API_BASE + '/users/me',
            headers={'Authorization': 'Bearer ' + access_token},
            timeout=15
        )
        resp.raise_for_status()
        user_data = resp.json()

        return jsonify({
            'user_id': user_data.get('id', ''),
            'nickname': user_data.get('nickname', ''),
            'email': user_data.get('email', ''),
            'country_id': user_data.get('country_id', ''),
            'site_id': user_data.get('site_id', ''),
            'status': user_data.get('status', {}),
        })

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'MP API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('mp_balance error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/mp/payments')
@rate_limit(max_per_minute=30)
def mp_payments():
    """GET /api/mp/payments?access_token=YYY&limit=10 -- Fetch recent payments."""
    try:
        access_token = _get_access_token(request.args.get('access_token'))
        limit = request.args.get('limit', '10')
        if not access_token:
            return jsonify({'error': 'access_token es requerido'}), 400

        resp = http_requests.get(
            MP_API_BASE + '/v1/payments/search',
            params={'sort': 'date_created', 'criteria': 'desc', 'limit': limit},
            headers={'Authorization': 'Bearer ' + access_token},
            timeout=15
        )
        resp.raise_for_status()
        resp_data = resp.json()

        results = resp_data.get('results', [])
        payments = []
        for p in results:
            payments.append({
                'id': p.get('id', ''),
                'status': p.get('status', ''),
                'status_detail': p.get('status_detail', ''),
                'amount': p.get('transaction_amount', 0),
                'currency': p.get('currency_id', ''),
                'payer_email': p.get('payer', {}).get('email', ''),
                'description': p.get('description', ''),
                'date_created': p.get('date_created', ''),
                'date_approved': p.get('date_approved', ''),
                'external_reference': p.get('external_reference', ''),
                'payment_method': p.get('payment_method_id', ''),
            })

        return jsonify({
            'total': resp_data.get('paging', {}).get('total', 0),
            'payments': payments
        })

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'MP API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('mp_payments error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/mp/payment-status')
@rate_limit(max_per_minute=30)
def mp_payment_status():
    """GET /api/mp/payment-status?preference_id=XXX&access_token=YYY"""
    try:
        preference_id = request.args.get('preference_id', '')
        access_token = _get_access_token(request.args.get('access_token'))

        if not preference_id or not access_token:
            return jsonify({'error': 'preference_id y access_token son requeridos'}), 400

        resp = http_requests.get(
            MP_API_BASE + '/v1/payments/search',
            params={'preference_id': preference_id, 'sort': 'date_created', 'criteria': 'desc'},
            headers={'Authorization': 'Bearer ' + access_token},
            timeout=15
        )
        resp.raise_for_status()
        resp_data = resp.json()

        results = resp_data.get('results', [])
        if results:
            latest = results[0]
            return jsonify({
                'status': latest.get('status', 'unknown'),
                'payment_id': latest.get('id', ''),
                'status_detail': latest.get('status_detail', ''),
                'amount': latest.get('transaction_amount', 0),
                'currency': latest.get('currency_id', ''),
                'date': latest.get('date_approved') or latest.get('date_created', '')
            })
        else:
            return jsonify({'status': 'not_found', 'payment_id': ''})

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'MP API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('mp_payment_status error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/mp/payment/<payment_id>')
@rate_limit(max_per_minute=30)
def mp_get_payment(payment_id):
    """GET /api/mp/payment/<id>?access_token=YYY -- get a specific payment by ID."""
    try:
        access_token = _get_access_token(request.args.get('access_token'))
        if not payment_id or not access_token:
            return jsonify({'error': 'payment_id y access_token son requeridos'}), 400

        resp = http_requests.get(
            MP_API_BASE + '/v1/payments/' + payment_id,
            headers={'Authorization': 'Bearer ' + access_token},
            timeout=15
        )
        resp.raise_for_status()
        resp_data = resp.json()

        return jsonify({
            'id': resp_data.get('id', ''),
            'status': resp_data.get('status', ''),
            'status_detail': resp_data.get('status_detail', ''),
            'amount': resp_data.get('transaction_amount', 0),
            'currency': resp_data.get('currency_id', ''),
            'payer_email': resp_data.get('payer', {}).get('email', ''),
            'date': resp_data.get('date_approved') or resp_data.get('date_created', ''),
            'external_reference': resp_data.get('external_reference', '')
        })

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'MP API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('mp_get_payment error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/mp/create-preference', methods=['POST'])
@rate_limit(max_per_minute=20)
def mp_create_preference():
    """POST /api/mp/create-preference -- Create a Mercado Pago checkout preference."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        access_token = _get_access_token(data.get('access_token'))
        if not access_token:
            return jsonify({'error': 'access_token es requerido'}), 400

        title = data.get('title', 'Consulta MiDoctorYa')
        description = data.get('description', '')
        price = data.get('price', 50000)
        currency = data.get('currency', 'COP')
        payer_email = data.get('payer_email', '')
        external_ref = data.get('external_reference', '')

        preference = {
            'items': [{
                'title': title,
                'description': description,
                'quantity': 1,
                'currency_id': currency,
                'unit_price': float(price)
            }],
            'external_reference': external_ref,
            'back_urls': {
                'success': data.get('success_url', 'http://localhost:8081/?payment=success'),
                'failure': data.get('failure_url', 'http://localhost:8081/?payment=failure'),
                'pending': data.get('pending_url', 'http://localhost:8081/?payment=pending')
            },
            'auto_return': 'approved',
            'statement_descriptor': 'MiDoctorYa',
            'notification_url': data.get('notification_url', '')
        }

        if payer_email:
            preference['payer'] = {'email': payer_email}

        resp = http_requests.post(
            MP_API_BASE + '/checkout/preferences',
            json=preference,
            headers={'Authorization': 'Bearer ' + access_token},
            timeout=15
        )
        resp.raise_for_status()
        resp_data = resp.json()

        return jsonify({
            'id': resp_data.get('id', ''),
            'init_point': resp_data.get('init_point', ''),
            'sandbox_init_point': resp_data.get('sandbox_init_point', ''),
            'external_reference': external_ref
        })

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'Mercado Pago API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('mp_create_preference error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/mp/webhook', methods=['POST'])
def mp_webhook():
    """POST /api/mp/webhook -- Mercado Pago IPN notifications."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        logger.info('[MP Webhook] %s', json.dumps(data, ensure_ascii=False)[:500])
        return jsonify({'status': 'ok'})
    except Exception as e:
        logger.exception('mp_webhook error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# SendGrid endpoint
# ===========================================================================
@app.route('/api/sendgrid/send', methods=['POST'])
@rate_limit(max_per_minute=10)
def sendgrid_send():
    """POST /api/sendgrid/send -- Send email via SendGrid API."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        api_key = data.get('api_key') or app.config['SENDGRID_API_KEY']
        from_email = data.get('from_email') or app.config['SENDGRID_FROM_EMAIL']
        to_email = data.get('to_email', '')
        subject = data.get('subject', '')
        html_body = data.get('html_body', '')

        if not api_key or not to_email:
            return jsonify({'error': 'api_key y to_email son requeridos'}), 400

        sg_payload = {
            'personalizations': [{
                'to': [{'email': to_email}],
                'subject': subject
            }],
            'from': {'email': from_email, 'name': 'MiDoctorYa'},
            'content': [{
                'type': 'text/html',
                'value': html_body
            }]
        }

        resp = http_requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            json=sg_payload,
            headers={'Authorization': 'Bearer ' + api_key},
            timeout=15
        )
        # SendGrid returns 202 on success with empty body
        if resp.status_code in (200, 201, 202):
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'SendGrid API error', 'details': resp.text}), resp.status_code

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'SendGrid API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('sendgrid_send error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# UltraMSG endpoint
# ===========================================================================
@app.route('/api/ultramsg/send', methods=['POST'])
@rate_limit(max_per_minute=20)
def ultramsg_send():
    """POST /api/ultramsg/send -- Send WhatsApp message via UltraMSG API."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        instance_id = data.get('instance_id') or app.config['ULTRAMSG_INSTANCE']
        token = data.get('token') or app.config['ULTRAMSG_TOKEN']
        to = data.get('to', '')
        body = data.get('body', '')

        if not instance_id or not token or not to:
            return jsonify({'error': 'instance_id, token y to son requeridos'}), 400

        resp = http_requests.post(
            'https://api.ultramsg.com/' + instance_id + '/messages/chat',
            json={'token': token, 'to': to, 'body': body},
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        resp_data = resp.json()

        return jsonify({'success': True, 'data': resp_data})

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'UltraMSG API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('ultramsg_send error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# Emergency notification
# ===========================================================================
@app.route('/api/emergency/notify', methods=['POST'])
@rate_limit(max_per_minute=10)
def emergency_notify():
    """POST /api/emergency/notify -- Send emergency notification and log the alert."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        phone = data.get('phone', '')
        message = data.get('message', '')
        notif_type = data.get('type', 'whatsapp')

        if not phone or not message:
            return jsonify({'error': 'phone y message son requeridos'}), 400

        logger.warning('[EMERGENCY ALERT] To: %s | Type: %s | %s', phone, notif_type, message[:200])

        result = {'logged': True, 'phone': phone, 'type': notif_type}

        if notif_type in ('whatsapp', 'both'):
            instance_id = data.get('instance_id') or app.config['ULTRAMSG_INSTANCE']
            token = data.get('token') or app.config['ULTRAMSG_TOKEN']
            if instance_id and token:
                try:
                    resp = http_requests.post(
                        'https://api.ultramsg.com/' + instance_id + '/messages/chat',
                        json={'token': token, 'to': phone, 'body': message},
                        headers={'Content-Type': 'application/json'},
                        timeout=15
                    )
                    resp_data = resp.json()
                    result['whatsapp_sent'] = True
                    result['whatsapp_response'] = resp_data
                except Exception as wa_err:
                    result['whatsapp_sent'] = False
                    result['whatsapp_error'] = str(wa_err)

        return jsonify({'success': True, 'result': result})

    except Exception as e:
        logger.exception('emergency_notify error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# Google Fit endpoints
# ===========================================================================
@app.route('/api/googlefit/token', methods=['POST'])
@rate_limit(max_per_minute=20)
def googlefit_token():
    """POST /api/googlefit/token -- Exchange auth code for tokens or refresh tokens."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        client_id = data.get('client_id') or app.config['GOOGLE_FIT_CLIENT_ID']
        client_secret = data.get('client_secret') or app.config['GOOGLE_FIT_CLIENT_SECRET']

        # Fallback: try config file
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'googlefit_config.json')
        if (not client_id or not client_secret) and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                cfg = json.load(f)
                client_id = client_id or cfg.get('client_id', '')
                client_secret = client_secret or cfg.get('client_secret', '')

        if not client_id or not client_secret:
            return jsonify({
                'error': 'client_id y client_secret son requeridos. '
                         'Configura GOOGLE_FIT_CLIENT_ID y GOOGLE_FIT_CLIENT_SECRET en el panel de admin.'
            }), 400

        grant_type = data.get('grant_type', 'authorization_code')
        token_url = 'https://oauth2.googleapis.com/token'

        if grant_type == 'refresh_token':
            payload = {
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': data.get('refresh_token', ''),
                'grant_type': 'refresh_token'
            }
        else:
            payload = {
                'client_id': client_id,
                'client_secret': client_secret,
                'code': data.get('code', ''),
                'grant_type': 'authorization_code',
                'redirect_uri': data.get('redirect_uri', '')
            }

        resp = http_requests.post(
            token_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        resp.raise_for_status()
        return jsonify(resp.json())

    except http_requests.HTTPError as e:
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'Google OAuth error', 'details': err_body}), status
    except Exception as e:
        logger.exception('googlefit_token error')
        return jsonify({'error': str(e)}), 500


@app.route('/api/googlefit/data')
@rate_limit(max_per_minute=30)
def googlefit_data():
    """GET /api/googlefit/data -- Proxy to fetch Google Fit data (avoids CORS)."""
    try:
        access_token = request.args.get('access_token', '')
        start_time = int(request.args.get('start_time', '0')) * 1000000  # ms to ns
        end_time = int(request.args.get('end_time', '0')) * 1000000

        if not access_token:
            return jsonify({'error': 'access_token es requerido'}), 400

        api_url = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'

        aggregate_body = {
            'aggregateBy': [
                {'dataTypeName': 'com.google.heart_rate.bpm',
                 'dataSourceId': 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm'},
                {'dataTypeName': 'com.google.step_count.delta',
                 'dataSourceId': 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'},
                {'dataTypeName': 'com.google.oxygen_saturation'},
                {'dataTypeName': 'com.google.body.temperature'},
                {'dataTypeName': 'com.google.sleep.segment'},
            ],
            'bucketByTime': {'durationMillis': 3600000},  # 1 hour buckets
            'startTimeMillis': start_time // 1000000,
            'endTimeMillis': end_time // 1000000
        }

        resp = http_requests.post(
            api_url,
            json=aggregate_body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access_token
            },
            timeout=15
        )
        resp.raise_for_status()
        resp_data = resp.json()

        # Parse into simpler format
        result = {
            'heartRate': [],
            'steps': [],
            'spo2': [],
            'bodyTemp': [],
            'sleep': []
        }

        for bucket in resp_data.get('bucket', []):
            for dataset in bucket.get('dataset', []):
                data_type = dataset.get('dataSourceId', '')
                for point in dataset.get('point', []):
                    ts = int(point.get('startTimeNanos', '0')) // 1000000
                    values = point.get('value', [])
                    if not values:
                        continue
                    val = values[0].get('fpVal', values[0].get('intVal', 0))

                    if 'heart_rate' in data_type:
                        result['heartRate'].append({'value': val, 'timestamp': ts})
                    elif 'step_count' in data_type:
                        result['steps'].append({'value': val, 'timestamp': ts})
                    elif 'oxygen_saturation' in data_type:
                        result['spo2'].append({'value': val, 'timestamp': ts})
                    elif 'body.temperature' in data_type or 'temperature' in data_type:
                        result['bodyTemp'].append({'value': val, 'timestamp': ts})
                    elif 'sleep' in data_type:
                        result['sleep'].append({'value': val, 'timestamp': ts})

        return jsonify(result)

    except http_requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 401:
            return jsonify({'error': 'Token expired'}), 401
        err_body = e.response.text if e.response is not None else str(e)
        status = e.response.status_code if e.response is not None else 500
        return jsonify({'error': 'Google Fit API error', 'details': err_body}), status
    except Exception as e:
        logger.exception('googlefit_data error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# ExerciseDB Image Proxy — serves GIF images from ExerciseDB API
# ===========================================================================
@app.route('/api/exercise-image/<exercise_id>')
def exercise_image_proxy(exercise_id):
    """GET /api/exercise-image/<id> — Proxy to fetch exercise GIF from ExerciseDB API.
    Caches images in memory to reduce API calls."""
    # Validate exercise_id (must be 4 digits)
    if not exercise_id or len(exercise_id) != 4 or not exercise_id.isdigit():
        return jsonify({'error': 'Invalid exercise ID'}), 400

    # Check cache first
    if exercise_id in _image_cache:
        resp = make_response(_image_cache[exercise_id])
        resp.headers['Content-Type'] = 'image/gif'
        resp.headers['Cache-Control'] = 'public, max-age=604800, immutable'  # 7 days
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp

    # Fetch from ExerciseDB API
    api_key = app.config['RAPIDAPI_KEY']
    if not api_key:
        return jsonify({'error': 'RapidAPI key not configured'}), 500

    try:
        api_resp = http_requests.get(
            f'https://{EXERCISEDB_HOST}/image',
            params={'exerciseId': exercise_id, 'resolution': '720'},
            headers={
                'x-rapidapi-host': EXERCISEDB_HOST,
                'x-rapidapi-key': api_key
            },
            timeout=30,
            stream=True
        )

        if api_resp.status_code != 200:
            logger.warning(f'[ExerciseDB] Image {exercise_id} returned {api_resp.status_code}')
            return jsonify({'error': 'Image not found'}), 404

        image_data = api_resp.content

        # Cache the image (evict oldest if full)
        if len(_image_cache) >= _IMAGE_CACHE_MAX:
            oldest = next(iter(_image_cache))
            del _image_cache[oldest]
        _image_cache[exercise_id] = image_data

        resp = make_response(image_data)
        resp.headers['Content-Type'] = 'image/gif'
        resp.headers['Cache-Control'] = 'public, max-age=604800, immutable'
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp

    except Exception as e:
        logger.exception(f'exercise_image_proxy error for {exercise_id}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/exercises/search')
@rate_limit(max_per_minute=30)
def exercises_search():
    """GET /api/exercises/search?q=push+up&limit=15 — Search exercises via ExerciseDB API."""
    api_key = app.config['RAPIDAPI_KEY']
    if not api_key:
        return jsonify([])

    q = request.args.get('q', '')
    limit = request.args.get('limit', '15')
    if not q:
        return jsonify([])

    try:
        resp = http_requests.get(
            f'https://{EXERCISEDB_HOST}/exercises/name/{q}',
            params={'limit': limit, 'offset': '0'},
            headers={
                'x-rapidapi-host': EXERCISEDB_HOST,
                'x-rapidapi-key': api_key
            },
            timeout=15
        )
        resp.raise_for_status()
        exercises = resp.json()
        # Add our proxy gifUrl
        for ex in exercises:
            ex['gifUrl'] = f'/api/exercise-image/{ex.get("id", "0000")}'
        return jsonify(exercises)
    except Exception as e:
        logger.warning(f'exercises_search error: {e}')
        return jsonify([])


@app.route('/api/exercises/bodypart/<body_part>')
@rate_limit(max_per_minute=30)
def exercises_by_bodypart(body_part):
    """GET /api/exercises/bodypart/<part>?limit=15 — Get exercises by body part."""
    api_key = app.config['RAPIDAPI_KEY']
    if not api_key:
        return jsonify([])

    limit = request.args.get('limit', '15')

    try:
        resp = http_requests.get(
            f'https://{EXERCISEDB_HOST}/exercises/bodyPart/{body_part}',
            params={'limit': limit, 'offset': '0'},
            headers={
                'x-rapidapi-host': EXERCISEDB_HOST,
                'x-rapidapi-key': api_key
            },
            timeout=15
        )
        resp.raise_for_status()
        exercises = resp.json()
        for ex in exercises:
            ex['gifUrl'] = f'/api/exercise-image/{ex.get("id", "0000")}'
        return jsonify(exercises)
    except Exception as e:
        logger.warning(f'exercises_by_bodypart error: {e}')
        return jsonify([])


@app.route('/api/exercises/bodypartlist')
@rate_limit(max_per_minute=10)
def exercises_bodypart_list():
    """GET /api/exercises/bodypartlist — Get list of body parts."""
    api_key = app.config['RAPIDAPI_KEY']
    if not api_key:
        return jsonify(['chest', 'back', 'shoulders', 'upper legs', 'upper arms', 'waist', 'cardio', 'lower legs', 'lower arms', 'neck'])

    try:
        resp = http_requests.get(
            f'https://{EXERCISEDB_HOST}/exercises/bodyPartList',
            headers={
                'x-rapidapi-host': EXERCISEDB_HOST,
                'x-rapidapi-key': api_key
            },
            timeout=15
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        logger.warning(f'exercises_bodypart_list error: {e}')
        return jsonify(['chest', 'back', 'shoulders', 'upper legs', 'upper arms', 'waist', 'cardio', 'lower legs', 'lower arms', 'neck'])


# ===========================================================================
# Services status
# ===========================================================================
@app.route('/api/services/status')
@rate_limit(max_per_minute=10)
def services_status():
    """GET /api/services/status -- Check connectivity status of all configured services."""
    try:
        results = {}

        # Check Mercado Pago
        mp_token = _get_access_token(request.args.get('access_token'))
        if mp_token:
            try:
                resp = http_requests.get(
                    MP_API_BASE + '/users/me',
                    headers={'Authorization': 'Bearer ' + mp_token},
                    timeout=10
                )
                resp.raise_for_status()
                data = resp.json()
                results['mercadopago'] = {'ok': True, 'email': data.get('email', ''), 'nickname': data.get('nickname', '')}
            except Exception as e:
                results['mercadopago'] = {'ok': False, 'error': str(e)}
        else:
            results['mercadopago'] = {'ok': False, 'error': 'No configurado'}

        # Check SendGrid
        sg_key = request.args.get('sendgrid_key') or app.config['SENDGRID_API_KEY']
        if sg_key and sg_key.startswith('SG.'):
            results['sendgrid'] = {'ok': True, 'message': 'API Key con formato valido'}
        elif sg_key:
            results['sendgrid'] = {'ok': False, 'error': 'Formato de API Key invalido (debe empezar con SG.)'}
        else:
            results['sendgrid'] = {'ok': False, 'error': 'No configurado'}

        # Check UltraMSG
        um_instance = request.args.get('ultramsg_instance') or app.config['ULTRAMSG_INSTANCE']
        um_token = request.args.get('ultramsg_token') or app.config['ULTRAMSG_TOKEN']
        if um_instance and um_token:
            results['ultramsg'] = {'ok': True, 'message': 'Credenciales configuradas'}
        else:
            results['ultramsg'] = {'ok': False, 'error': 'No configurado'}

        # Check Google Fit
        gfit_id = request.args.get('gfit_client_id') or app.config['GOOGLE_FIT_CLIENT_ID']
        if gfit_id and '.apps.googleusercontent.com' in gfit_id:
            results['googlefit'] = {'ok': True, 'message': 'Client ID con formato valido'}
        elif gfit_id:
            results['googlefit'] = {'ok': False, 'error': 'Formato de Client ID invalido'}
        else:
            results['googlefit'] = {'ok': False, 'error': 'No configurado'}

        return jsonify(results)

    except Exception as e:
        logger.exception('services_status error')
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# Entry point
# ===========================================================================
if __name__ == '__main__':
    port = int(os.getenv('PORT', 8081))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    logger.info(f'MiDoctorYa Lite PWA — http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
