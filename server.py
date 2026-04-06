"""
server.py -- Servidor Python para MiDoctorYa Lite PWA
Ejecutar: python server.py
"""
import os
import sys
import json
import mimetypes
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# MIME types for PWA
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/manifest+json', '.json')
mimetypes.add_type('text/css', '.css')

PORT = 8081
DIR = os.path.dirname(os.path.abspath(__file__))

# Change working directory so SimpleHTTPRequestHandler serves from here
os.chdir(DIR)

MP_API_BASE = 'https://api.mercadopago.com'


class PWAHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/mp/create-preference':
            self._handle_create_preference()
        elif self.path == '/api/mp/webhook':
            self._handle_webhook()
        elif self.path == '/api/sendgrid/send':
            self._handle_sendgrid_send()
        elif self.path == '/api/ultramsg/send':
            self._handle_ultramsg_send()
        elif self.path == '/api/emergency/notify':
            self._handle_emergency_notify()
        elif self.path == '/api/googlefit/token':
            self._handle_googlefit_token()
        else:
            self.send_error(404, 'Not found')

    def do_GET(self):
        if self.path.startswith('/api/mp/balance'):
            self._handle_mp_balance()
        elif self.path.startswith('/api/mp/payments'):
            self._handle_mp_payments()
        elif self.path.startswith('/api/mp/payment-status'):
            self._handle_payment_status()
        elif self.path.startswith('/api/mp/payment/'):
            self._handle_get_payment()
        elif self.path.startswith('/api/googlefit/data'):
            self._handle_googlefit_data()
        elif self.path.startswith('/api/services/status'):
            self._handle_services_status()
        else:
            super().do_GET()

    def _read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        body = self.rfile.read(length)
        return json.loads(body.decode('utf-8'))

    def _send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(payload)

    def _handle_mp_balance(self):
        """GET /api/mp/balance?access_token=YYY — Fetch MP account balance info."""
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            access_token = params.get('access_token', [''])[0]

            if not access_token:
                self._send_json(400, {'error': 'access_token es requerido'})
                return

            # Get user info (includes balance)
            req = urllib.request.Request(
                MP_API_BASE + '/users/me',
                headers={'Authorization': 'Bearer ' + access_token},
                method='GET'
            )

            with urllib.request.urlopen(req) as resp:
                user_data = json.loads(resp.read().decode('utf-8'))

            self._send_json(200, {
                'user_id': user_data.get('id', ''),
                'nickname': user_data.get('nickname', ''),
                'email': user_data.get('email', ''),
                'country_id': user_data.get('country_id', ''),
                'site_id': user_data.get('site_id', ''),
                'status': user_data.get('status', {}),
            })

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'MP API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_mp_payments(self):
        """GET /api/mp/payments?access_token=YYY&limit=10 — Fetch recent payments."""
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            access_token = params.get('access_token', [''])[0]
            limit = params.get('limit', ['10'])[0]

            if not access_token:
                self._send_json(400, {'error': 'access_token es requerido'})
                return

            search_url = (MP_API_BASE + '/v1/payments/search?sort=date_created&criteria=desc&limit=' + str(limit))
            req = urllib.request.Request(
                search_url,
                headers={'Authorization': 'Bearer ' + access_token},
                method='GET'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

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

            self._send_json(200, {
                'total': resp_data.get('paging', {}).get('total', 0),
                'payments': payments
            })

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'MP API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_services_status(self):
        """GET /api/services/status?access_token=MP_TOKEN&sendgrid_key=SG_KEY&ultramsg_instance=X&ultramsg_token=Y&gfit_client_id=Z
        Check connectivity status of all configured services."""
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            results = {}

            # Check Mercado Pago
            mp_token = params.get('access_token', [''])[0]
            if mp_token:
                try:
                    req = urllib.request.Request(
                        MP_API_BASE + '/users/me',
                        headers={'Authorization': 'Bearer ' + mp_token},
                        method='GET'
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        data = json.loads(resp.read().decode('utf-8'))
                    results['mercadopago'] = {'ok': True, 'email': data.get('email', ''), 'nickname': data.get('nickname', '')}
                except Exception as e:
                    results['mercadopago'] = {'ok': False, 'error': str(e)}
            else:
                results['mercadopago'] = {'ok': False, 'error': 'No configurado'}

            # Check SendGrid (just validate key format)
            sg_key = params.get('sendgrid_key', [''])[0]
            if sg_key and sg_key.startswith('SG.'):
                results['sendgrid'] = {'ok': True, 'message': 'API Key con formato valido'}
            elif sg_key:
                results['sendgrid'] = {'ok': False, 'error': 'Formato de API Key invalido (debe empezar con SG.)'}
            else:
                results['sendgrid'] = {'ok': False, 'error': 'No configurado'}

            # Check UltraMSG
            um_instance = params.get('ultramsg_instance', [''])[0]
            um_token = params.get('ultramsg_token', [''])[0]
            if um_instance and um_token:
                results['ultramsg'] = {'ok': True, 'message': 'Credenciales configuradas'}
            else:
                results['ultramsg'] = {'ok': False, 'error': 'No configurado'}

            # Check Google Fit
            gfit_id = params.get('gfit_client_id', [''])[0]
            if gfit_id and '.apps.googleusercontent.com' in gfit_id:
                results['googlefit'] = {'ok': True, 'message': 'Client ID con formato valido'}
            elif gfit_id:
                results['googlefit'] = {'ok': False, 'error': 'Formato de Client ID invalido'}
            else:
                results['googlefit'] = {'ok': False, 'error': 'No configurado'}

            self._send_json(200, results)

        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_create_preference(self):
        """POST /api/mp/create-preference
        Body: { title, description, price, currency, access_token, sandbox, payer_email, external_reference }
        Creates a Mercado Pago checkout preference.
        """
        try:
            data = self._read_json_body()
            access_token = data.get('access_token', '')
            if not access_token:
                self._send_json(400, {'error': 'access_token es requerido'})
                return

            title = data.get('title', 'Consulta MiDoctorYa')
            description = data.get('description', '')
            price = data.get('price', 50000)
            currency = data.get('currency', 'COP')
            payer_email = data.get('payer_email', '')
            external_ref = data.get('external_reference', '')
            sandbox = data.get('sandbox', True)

            # Build preference payload
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

            pref_json = json.dumps(preference).encode('utf-8')

            req = urllib.request.Request(
                MP_API_BASE + '/checkout/preferences',
                data=pref_json,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + access_token
                },
                method='POST'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            self._send_json(200, {
                'id': resp_data.get('id', ''),
                'init_point': resp_data.get('init_point', ''),
                'sandbox_init_point': resp_data.get('sandbox_init_point', ''),
                'external_reference': external_ref
            })

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'Mercado Pago API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_webhook(self):
        """POST /api/mp/webhook — placeholder for Mercado Pago IPN notifications."""
        try:
            data = self._read_json_body()
            # Log webhook for debugging
            print('[MP Webhook]', json.dumps(data, ensure_ascii=False)[:500], flush=True)
            self._send_json(200, {'status': 'ok'})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_payment_status(self):
        """GET /api/mp/payment-status?preference_id=XXX&access_token=YYY
        Searches for payments associated with a preference.
        """
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            preference_id = params.get('preference_id', [''])[0]
            access_token = params.get('access_token', [''])[0]

            if not preference_id or not access_token:
                self._send_json(400, {'error': 'preference_id y access_token son requeridos'})
                return

            # Search payments by external reference or preference
            search_url = MP_API_BASE + '/v1/payments/search?preference_id=' + preference_id + '&sort=date_created&criteria=desc'
            req = urllib.request.Request(
                search_url,
                headers={'Authorization': 'Bearer ' + access_token},
                method='GET'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            results = resp_data.get('results', [])
            if results:
                latest = results[0]
                self._send_json(200, {
                    'status': latest.get('status', 'unknown'),
                    'payment_id': latest.get('id', ''),
                    'status_detail': latest.get('status_detail', ''),
                    'amount': latest.get('transaction_amount', 0),
                    'currency': latest.get('currency_id', ''),
                    'date': latest.get('date_approved') or latest.get('date_created', '')
                })
            else:
                self._send_json(200, {'status': 'not_found', 'payment_id': ''})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'MP API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_get_payment(self):
        """GET /api/mp/payment/<id>?access_token=YYY — get a specific payment by ID."""
        try:
            from urllib.parse import urlparse, parse_qs
            parts = self.path.split('/')
            payment_id = parts[-1].split('?')[0] if len(parts) >= 4 else ''
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            access_token = params.get('access_token', [''])[0]

            if not payment_id or not access_token:
                self._send_json(400, {'error': 'payment_id y access_token son requeridos'})
                return

            req = urllib.request.Request(
                MP_API_BASE + '/v1/payments/' + payment_id,
                headers={'Authorization': 'Bearer ' + access_token},
                method='GET'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            self._send_json(200, {
                'id': resp_data.get('id', ''),
                'status': resp_data.get('status', ''),
                'status_detail': resp_data.get('status_detail', ''),
                'amount': resp_data.get('transaction_amount', 0),
                'currency': resp_data.get('currency_id', ''),
                'payer_email': resp_data.get('payer', {}).get('email', ''),
                'date': resp_data.get('date_approved') or resp_data.get('date_created', ''),
                'external_reference': resp_data.get('external_reference', '')
            })

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'MP API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_sendgrid_send(self):
        """POST /api/sendgrid/send — Send email via SendGrid API."""
        try:
            data = self._read_json_body()
            api_key = data.get('api_key', '')
            from_email = data.get('from_email', 'noreply@midoctorya.com')
            to_email = data.get('to_email', '')
            subject = data.get('subject', '')
            html_body = data.get('html_body', '')

            if not api_key or not to_email:
                self._send_json(400, {'error': 'api_key y to_email son requeridos'})
                return

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

            sg_json = json.dumps(sg_payload).encode('utf-8')
            req = urllib.request.Request(
                'https://api.sendgrid.com/v3/mail/send',
                data=sg_json,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + api_key
                },
                method='POST'
            )

            with urllib.request.urlopen(req) as resp:
                # SendGrid returns 202 on success with empty body
                self._send_json(200, {'success': True})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'SendGrid API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_ultramsg_send(self):
        """POST /api/ultramsg/send — Send WhatsApp message via UltraMSG API."""
        try:
            data = self._read_json_body()
            instance_id = data.get('instance_id', '')
            token = data.get('token', '')
            to = data.get('to', '')
            body = data.get('body', '')

            if not instance_id or not token or not to:
                self._send_json(400, {'error': 'instance_id, token y to son requeridos'})
                return

            um_payload = json.dumps({
                'token': token,
                'to': to,
                'body': body
            }).encode('utf-8')

            req = urllib.request.Request(
                'https://api.ultramsg.com/' + instance_id + '/messages/chat',
                data=um_payload,
                headers={
                    'Content-Type': 'application/json'
                },
                method='POST'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            self._send_json(200, {'success': True, 'data': resp_data})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'UltraMSG API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_emergency_notify(self):
        """POST /api/emergency/notify — Send emergency notification via WhatsApp (UltraMSG) and log the alert."""
        try:
            data = self._read_json_body()
            phone = data.get('phone', '')
            message = data.get('message', '')
            notif_type = data.get('type', 'whatsapp')

            if not phone or not message:
                self._send_json(400, {'error': 'phone y message son requeridos'})
                return

            # Log the emergency alert
            print('[EMERGENCY ALERT] To:', phone, '| Type:', notif_type, '|', message[:200], flush=True)

            # If type includes whatsapp, try to send via UltraMSG
            # The client can also call /api/ultramsg/send directly; this endpoint
            # provides a unified emergency interface and logging.
            result = {'logged': True, 'phone': phone, 'type': notif_type}

            if notif_type in ('whatsapp', 'both'):
                # Try to read UltraMSG config from the request or use defaults
                instance_id = data.get('instance_id', '')
                token = data.get('token', '')
                if instance_id and token:
                    try:
                        um_payload = json.dumps({
                            'token': token,
                            'to': phone,
                            'body': message
                        }).encode('utf-8')
                        req = urllib.request.Request(
                            'https://api.ultramsg.com/' + instance_id + '/messages/chat',
                            data=um_payload,
                            headers={'Content-Type': 'application/json'},
                            method='POST'
                        )
                        with urllib.request.urlopen(req) as resp:
                            resp_data = json.loads(resp.read().decode('utf-8'))
                        result['whatsapp_sent'] = True
                        result['whatsapp_response'] = resp_data
                    except Exception as wa_err:
                        result['whatsapp_sent'] = False
                        result['whatsapp_error'] = str(wa_err)

            self._send_json(200, {'success': True, 'result': result})

        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_googlefit_token(self):
        """POST /api/googlefit/token — Exchange auth code for tokens or refresh tokens."""
        try:
            data = self._read_json_body()
            # Read client credentials from dya_config in the request or use defaults
            client_id = data.get('client_id', '')
            client_secret = data.get('client_secret', '')

            # If not provided in request, try to read from a config file
            config_path = os.path.join(DIR, 'googlefit_config.json')
            if (not client_id or not client_secret) and os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    cfg = json.load(f)
                    client_id = client_id or cfg.get('client_id', '')
                    client_secret = client_secret or cfg.get('client_secret', '')

            if not client_id or not client_secret:
                self._send_json(400, {'error': 'client_id y client_secret son requeridos. Configura GOOGLE_FIT_CLIENT_ID y GOOGLE_FIT_CLIENT_SECRET en el panel de admin.'})
                return

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

            encoded = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                token_url,
                data=encoded,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            self._send_json(200, resp_data)

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            self._send_json(e.code, {'error': 'Google OAuth error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def _handle_googlefit_data(self):
        """GET /api/googlefit/data — Proxy to fetch Google Fit data (avoids CORS)."""
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            access_token = params.get('access_token', [''])[0]
            start_time = int(params.get('start_time', ['0'])[0]) * 1000000  # ms to ns
            end_time = int(params.get('end_time', ['0'])[0]) * 1000000

            if not access_token:
                self._send_json(400, {'error': 'access_token es requerido'})
                return

            api_url = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'

            # Build aggregate request for multiple data types
            aggregate_body = {
                'aggregateBy': [
                    {'dataTypeName': 'com.google.heart_rate.bpm', 'dataSourceId': 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm'},
                    {'dataTypeName': 'com.google.step_count.delta', 'dataSourceId': 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'},
                    {'dataTypeName': 'com.google.oxygen_saturation'},
                    {'dataTypeName': 'com.google.body.temperature'},
                    {'dataTypeName': 'com.google.sleep.segment'},
                ],
                'bucketByTime': {'durationMillis': 3600000},  # 1 hour buckets
                'startTimeMillis': start_time // 1000000,
                'endTimeMillis': end_time // 1000000
            }

            encoded = json.dumps(aggregate_body).encode('utf-8')
            req = urllib.request.Request(
                api_url,
                data=encoded,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + access_token
                },
                method='POST'
            )

            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))

            # Parse the response into a simpler format
            result = {
                'heartRate': [],
                'steps': [],
                'spo2': [],
                'bodyTemp': [],
                'sleep': []
            }

            for bucket in resp_data.get('bucket', []):
                bucket_start = int(bucket.get('startTimeMillis', 0))
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

            self._send_json(200, result)

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            status_code = e.code
            if status_code == 401:
                self._send_json(401, {'error': 'Token expired'})
            else:
                self._send_json(status_code, {'error': 'Google Fit API error', 'details': err_body})
        except Exception as e:
            self._send_json(500, {'error': str(e)})

    def log_message(self, format, *args):
        pass  # Silent


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    print(f"MiDoctorYa Lite PWA -- http://localhost:{PORT}", flush=True)
    server = ThreadedHTTPServer(('0.0.0.0', PORT), PWAHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == '__main__':
    main()
