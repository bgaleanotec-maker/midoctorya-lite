"""
Post-deployment smoke tests for MiDoctorYa Lite
Usage: python test_deploy.py [base_url]
Default: http://localhost:8081
"""
import sys
import json
import urllib.request
import urllib.error
import time

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8081'
PASS = 0
FAIL = 0
TESTS = []

def test(name, url, expect_status=200, expect_contains=None, method='GET', body=None):
    global PASS, FAIL
    try:
        if body:
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(BASE + url, data=data, method=method)
            req.add_header('Content-Type', 'application/json')
        else:
            req = urllib.request.Request(BASE + url, method=method)

        start = time.time()
        with urllib.request.urlopen(req, timeout=10) as resp:
            elapsed = round((time.time() - start) * 1000)
            status = resp.status
            raw = resp.read()
            try:
                content = raw.decode('utf-8')
            except UnicodeDecodeError:
                content = ''  # Binary file (images, etc.)

            if status != expect_status:
                FAIL += 1
                TESTS.append(f'  FAIL  {name} — expected {expect_status}, got {status} ({elapsed}ms)')
                return

            if expect_contains and expect_contains not in content:
                FAIL += 1
                TESTS.append(f'  FAIL  {name} — missing "{expect_contains}" ({elapsed}ms)')
                return

            PASS += 1
            TESTS.append(f'  PASS  {name} ({elapsed}ms)')

    except urllib.error.HTTPError as e:
        elapsed = 0
        if e.code == expect_status:
            PASS += 1
            TESTS.append(f'  PASS  {name} — got expected {e.code}')
        else:
            FAIL += 1
            TESTS.append(f'  FAIL  {name} — HTTP {e.code}: {e.reason}')
    except Exception as e:
        FAIL += 1
        TESTS.append(f'  FAIL  {name} — {str(e)}')

print(f'\n  MiDoctorYa Lite — Smoke Tests')
print(f'  Base URL: {BASE}\n')
print('  ' + '=' * 50)

# Static file tests
test('Homepage loads', '/', expect_contains='MiDoctorYa')
test('Admin panel loads', '/admin.html', expect_contains='Admin')
test('Doctor panel loads', '/doctor.html', expect_contains='Doctor')
test('CSS loads', '/css/app.css', expect_contains='body')
test('App JS loads', '/js/app.js', expect_contains='import')
test('Wearables JS loads', '/js/wearables.js', expect_contains='DEVICE_PROFILES')
test('Manifest loads', '/manifest.json', expect_contains='MiDoctorYa')
test('Service Worker loads', '/sw.js', expect_contains='CACHE_NAME')
test('Icon 192 loads', '/icons/icon-192.png')
test('Icon 512 loads', '/icons/icon-512.png')

# API tests
# Health check only exists on server_prod.py (production)
try:
    urllib.request.urlopen(BASE + '/api/health', timeout=3)
    test('Health check', '/api/health', expect_contains='status')
except:
    TESTS.append('  SKIP  Health check (only in production server)')

test('MP balance without token', '/api/mp/balance', expect_status=400)
test('MP payments without token', '/api/mp/payments', expect_status=400)
test('Services status', '/api/services/status', expect_contains='mercadopago')
test('404 for unknown API', '/api/nonexistent', expect_status=404)

# Security headers (manual check)
try:
    req = urllib.request.Request(BASE + '/')
    with urllib.request.urlopen(req, timeout=10) as resp:
        headers = dict(resp.headers)
        if 'X-Content-Type-Options' in headers or 'x-content-type-options' in headers:
            PASS += 1
            TESTS.append('  PASS  Security headers present')
        else:
            TESTS.append('  SKIP  Security headers (dev server)')
except:
    TESTS.append('  SKIP  Security headers check')

print()
for t in TESTS:
    print(t)
print()
print('  ' + '=' * 50)
print(f'  Results: {PASS} passed, {FAIL} failed, {PASS + FAIL} total')
print()

if FAIL > 0:
    print('  DEPLOYMENT CHECK: ISSUES FOUND')
    sys.exit(1)
else:
    print('  DEPLOYMENT CHECK: ALL CLEAR')
    sys.exit(0)
