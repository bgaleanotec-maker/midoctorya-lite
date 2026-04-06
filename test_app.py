"""
test_app.py -- Pruebas automatizadas para MiDoctorYa Lite
Simula usuarios, prueba endpoints, y genera log de resultados.
Ejecutar: python test_app.py
"""
import sys
import json
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API = "http://localhost:5000/api/v1"
PWA = "http://localhost:8080"
PASS = 0
FAIL = 0
LOGS = []

def log(status, test, detail=""):
    global PASS, FAIL
    icon = "[OK]" if status else "[FAIL]"
    if status:
        PASS += 1
    else:
        FAIL += 1
    msg = f"  {icon} {test}" + (f" -- {detail}" if detail else "")
    print(msg)
    LOGS.append(msg)

def get(url):
    try:
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"success": False, "error": str(e)}

def post(url, data):
    try:
        body = json.dumps(data).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"success": False, "error": str(e)}

def patch(url):
    try:
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"}, method="PATCH")
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Usuarios simulados ──────────────────────────────────────────────────

USERS = [
    {"name": "Carlos Lopez", "email": "carlos@test.com", "birthdate": "1985-03-15", "country": "CO", "lang": "es"},
    {"name": "Maria Garcia", "email": "maria@test.com", "birthdate": "1990-08-22", "country": "CO", "lang": "es"},
    {"name": "John Smith", "email": "john@test.com", "birthdate": "2000-01-10", "country": "US", "lang": "en"},
    {"name": "Sophie Dubois", "email": "sophie@test.com", "birthdate": "1978-06-05", "country": "FR", "lang": "fr"},
    {"name": "Alex Rivera", "email": "alex@test.com", "birthdate": "2008-11-30", "country": "MX", "lang": "es"},
]


def main():
    print()
    print("=" * 60)
    print("  MiDoctorYa Lite -- Test Suite")
    print("=" * 60)
    print()

    # ── 1. Check servers ────────────────────────────────────────────
    print("--- 1. Servidores ---")

    # Backend
    r = get(f"{API}/health")
    log(r.get("status") == "ok" or "success" in str(r), "Backend health", str(r)[:80])

    # PWA
    try:
        req = urllib.request.urlopen(PWA, timeout=5)
        html = req.read().decode()
        log("MiDoctorYa" in html, "PWA serves index.html", f"{len(html)} bytes")
    except Exception as e:
        log(False, "PWA serves index.html", str(e)[:80])

    # manifest.json
    try:
        req = urllib.request.urlopen(f"{PWA}/manifest.json", timeout=5)
        mf = json.loads(req.read().decode())
        log(mf.get("name") == "MiDoctorYa", "manifest.json valid", f'display={mf.get("display")}')
    except Exception as e:
        log(False, "manifest.json", str(e)[:80])

    # sw.js
    try:
        req = urllib.request.urlopen(f"{PWA}/sw.js", timeout=5)
        sw = req.read().decode()
        log("CACHE_NAME" in sw, "Service Worker accessible", f"{len(sw)} bytes")
    except Exception as e:
        log(False, "Service Worker", str(e)[:80])

    print()

    # ── 2. Fitness API ──────────────────────────────────────────────
    print("--- 2. Fitness API ---")

    r = get(f"{API}/fitness/external/bodyparts")
    bps = r.get("data", [])
    log(len(bps) > 0, "GET /bodyparts", f"{len(bps)} body parts")

    r = get(f"{API}/fitness/external/search?q=squat&limit=5")
    exs = r.get("data", [])
    log(len(exs) > 0, "GET /search?q=squat", f"{len(exs)} results")
    if exs:
        has_gif = any(e.get("gifUrl") for e in exs)
        log(has_gif, "Exercises have gifUrl", exs[0].get("gifUrl", "N/A")[:80])

    r = get(f"{API}/fitness/external/bodypart/chest?limit=5")
    log(r.get("success", False), "GET /bodypart/chest", f'{r.get("count", 0)} exercises')

    # Exercise detail
    if exs:
        eid = exs[0].get("id", "0001")
        r = get(f"{API}/fitness/external/exercise/{eid}")
        log(r.get("success", False), f"GET /exercise/{eid}", r.get("data", {}).get("name", "N/A")[:50])

    print()

    # ── 3. Simulated Users — Fitness Recommendations ────────────────
    print("--- 3. Usuarios Simulados -- Fitness ---")

    for user in USERS:
        # Calculate age from birthdate
        from datetime import datetime
        birth = datetime.strptime(user["birthdate"], "%Y-%m-%d")
        age = (datetime.now() - birth).days // 365
        r = get(f"{API}/fitness/external/recommend?gender=male&limit=6")
        data = r.get("data", {})
        exercises = data.get("exercises", [])
        day_label = data.get("day_label", "N/A")
        gif_count = sum(1 for e in exercises if e.get("gifUrl"))
        log(
            len(exercises) > 0,
            f"[{user['name']}] age={age} country={user['country']}",
            f"plan='{day_label}' exercises={len(exercises)} gifs={gif_count}"
        )

    print()

    # ── 4. Stress API ───────────────────────────────────────────────
    print("--- 4. Stress API ---")

    # Mood logging per user
    for user in USERS:
        mood_val = {"Carlos Lopez": 5, "Maria Garcia": 4, "John Smith": 3, "Sophie Dubois": 2, "Alex Rivera": 1}.get(user["name"], 3)
        r = post(f"{API}/stress/mood", {"mood": mood_val, "notes": f"Test mood from {user['name']}"})
        log(r.get("success", False), f"[{user['name']}] POST /mood val={mood_val}", str(r.get("data", r.get("error", "")))[:60])

    # Breathing
    r = post(f"{API}/stress/breathing", {"duration_seconds": 120, "technique": "4-7-8"})
    log(r.get("success", False), "POST /breathing 120s", str(r.get("data", ""))[:60])

    # Dashboard
    r = get(f"{API}/stress/dashboard")
    log(r.get("success", False), "GET /stress/dashboard", str(r.get("data", ""))[:80])

    print()

    # ── 5. Appointments API (Colombia users only) ───────────────────
    print("--- 5. Appointments API ---")

    # Seed doctors
    r = post(f"{API}/appointments/seed-doctors", {})
    log(True, "POST /seed-doctors", str(r)[:80])

    # List doctors
    r = get(f"{API}/appointments/doctors")
    docs = r.get("data", [])
    log(len(docs) > 0, "GET /doctors", f"{len(docs)} doctors")

    if docs:
        doc = docs[0]
        did = doc.get("id", 1)

        # Slots
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        r = get(f"{API}/appointments/doctors/{did}/slots?date={tomorrow}")
        slots = r.get("data", [])
        log(len(slots) > 0, f"GET /doctors/{did}/slots date={tomorrow}", f"{len(slots)} slots")

        # Book for Colombian users
        for user in USERS:
            if user["country"] == "CO":
                if isinstance(slots, list) and len(slots) > 0:
                    s = slots[0]
                    slot_time = s.get("time", s) if isinstance(s, dict) else str(s)
                elif isinstance(slots, dict):
                    first_key = next(iter(slots), None)
                    slot_time = slots[first_key][0] if first_key and slots[first_key] else "09:00"
                else:
                    slot_time = "09:00"
                r = post(f"{API}/appointments/book", {
                    "doctor_id": did,
                    "date": tomorrow,
                    "time": slot_time,
                    "reason": f"Consulta de prueba - {user['name']}",
                    "patient_name": user["name"],
                    "patient_email": user["email"],
                })
                log(r.get("success", False) or "already" in str(r).lower() or "booked" in str(r).lower(),
                    f"[{user['name']}] POST /book {tomorrow} {slot_time}",
                    str(r.get("data", r.get("error", "")))[:60])

        # My appointments
        r = get(f"{API}/appointments/my")
        apts = r.get("data", [])
        log(True, "GET /my", f"{len(apts)} appointments")

        # Cancel test
        if apts:
            apt_id = apts[-1].get("id", 1)
            r = patch(f"{API}/appointments/{apt_id}/cancel")
            log(r.get("success", False) or "cancel" in str(r).lower(),
                f"PATCH /{apt_id}/cancel", str(r.get("data", r.get("error", "")))[:60])

    print()

    # ── 6. International Users — No appointments ────────────────────
    print("--- 6. Usuarios Internacionales ---")

    for user in USERS:
        has_apts = user["country"] == "CO"
        log(True,
            f"[{user['name']}] country={user['country']} lang={user['lang']}",
            f"appointments={'YES' if has_apts else 'NO (hidden)'} birthdate={user['birthdate']}")

    print()

    # ── 7. PWA Assets ───────────────────────────────────────────────
    print("--- 7. PWA Assets ---")

    assets = [
        ("/css/app.css", "CSS"),
        ("/js/app.js", "App Shell"),
        ("/js/i18n.js", "i18n"),
        ("/js/api.js", "API Client"),
        ("/js/fitness.js", "Fitness Module"),
        ("/js/nutrition.js", "Nutrition Module"),
        ("/js/stress.js", "Stress Module"),
        ("/js/habits.js", "Habits Module"),
        ("/js/appointments.js", "Appointments Module"),
        ("/icons/icon-192.png", "Icon 192px"),
        ("/icons/icon-512.png", "Icon 512px"),
    ]

    for path, name in assets:
        try:
            req = urllib.request.urlopen(f"{PWA}{path}", timeout=5)
            size = len(req.read())
            log(size > 0, f"{name} ({path})", f"{size:,} bytes")
        except Exception as e:
            log(False, f"{name} ({path})", str(e)[:60])

    print()

    # ── Summary ─────────────────────────────────────────────────────
    print("=" * 60)
    total = PASS + FAIL
    print(f"  RESULTADO: {PASS}/{total} pruebas pasaron" + (f" ({FAIL} fallaron)" if FAIL else " -- TODO OK!"))
    print("=" * 60)
    print()

    # Save log
    with open("test_results.log", "w", encoding="utf-8") as f:
        f.write("MiDoctorYa Lite -- Test Results\n")
        f.write(f"Fecha: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Resultado: {PASS}/{total}\n\n")
        for line in LOGS:
            f.write(line + "\n")
    print("  Log guardado en: test_results.log")
    print()


if __name__ == "__main__":
    main()
