"""Prueba E2E del flujo principal contra la API local."""

import asyncio
import sys
import uuid

import httpx

BASE = "http://localhost:8000/api/v1"
ADMIN_USER = "profesor_test"
ADMIN_PASS = "AdminTest123!"
STUDENT_USER = f"est_{uuid.uuid4().hex[:8]}"
STUDENT_TEMP = "TempPass123!"


def ok(label: str) -> None:
    print(f"  OK  {label}")


def fail(label: str, detail: str = "") -> None:
    print(f"  FAIL {label} {detail}")
    sys.exit(1)


async def main() -> None:
    print("=== Prueba E2E Simulador de verbos ===\n")

    async with httpx.AsyncClient(base_url=BASE, timeout=30.0) as client:
        # 1. Health
        r = await client.get("/health/live")
        if r.status_code != 200:
            fail("health/live", r.text)
        ok("health/live")

        r = await client.get("/health/ready")
        if r.status_code != 200:
            fail("health/ready", r.text)
        ok("health/ready")

        # 2. Crear admin (via script en contenedor - verificamos login después)
        # Asumimos admin creado externamente; intentamos login
        r = await client.post("/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        if r.status_code != 200:
            print(f"\n  Admin no existe aún. Créalo con:")
            print(f"  docker compose exec backend python -m scripts.create_admin")
            print(f"  (usuario: {ADMIN_USER}, clave: {ADMIN_PASS})\n")
            fail("login admin", r.text)

        admin_cookies = r.cookies
        ok(f"login admin ({ADMIN_USER})")

        # 3. Crear estudiante
        r = await client.post(
            "/admin/users",
            json={"username": STUDENT_USER, "full_name": "Estudiante Prueba", "role": "STUDENT"},
            cookies=admin_cookies,
        )
        if r.status_code not in (200, 201):
            fail("crear estudiante", r.text)
        temp_password = r.json()["temporary_password"]
        ok(f"crear estudiante ({STUDENT_USER}) clave={temp_password}")

        # 4. Login estudiante
        r = await client.post(
            "/auth/login",
            json={"username": STUDENT_USER, "password": temp_password},
        )
        if r.status_code != 200:
            fail("login estudiante", r.text)
        student_cookies = r.cookies
        if not r.json().get("must_change_password"):
            fail("must_change_password esperado")
        ok("login estudiante (clave temporal)")

        # 5. Cambiar contraseña
        r = await client.post(
            "/auth/change-password",
            json={"current_password": temp_password, "new_password": STUDENT_TEMP},
            cookies=student_cookies,
        )
        if r.status_code != 200:
            fail("cambiar contraseña", r.text)
        ok("cambio de contraseña obligatorio")

        # Re-login estudiante
        r = await client.post(
            "/auth/login",
            json={"username": STUDENT_USER, "password": STUDENT_TEMP},
        )
        student_cookies = r.cookies
        ok("re-login estudiante")

        # 6. Iniciar examen
        r = await client.post("/attempts", cookies=student_cookies)
        if r.status_code != 200:
            fail("iniciar examen", r.text)
        attempt = r.json()
        questions = attempt["questions"]
        if len(questions) != 20:
            fail("cantidad preguntas", f"esperado 20, got {len(questions)}")
        verb_ids = [q.get("shown_value") for q in questions]
        if len(set(verb_ids)) != 20:
            fail("verbos únicos", f"solo {len(set(verb_ids))} únicos")
        types = [q["prompt_type"] for q in questions]
        from collections import Counter

        counts = Counter(types)
        if sorted(counts.values()) != [6, 7, 7]:
            fail("distribución 7/7/6", str(dict(counts)))
        ok(f"examen: 20 verbos únicos, distribución {dict(counts)}")

        attempt_id = attempt["id"]

        # 7. Responder primera pregunta (valores vacíos intencionalmente parcial)
        q = questions[0]
        answers = {"base": None, "past": None, "spanish": None}
        for field in q["required_fields"]:
            key = field["field"].lower()
            if key == "base":
                answers["base"] = q["shown_value"] if q["shown_field"] != "BASE" else "test"
            elif key == "past":
                answers["past"] = "test"
            else:
                answers["spanish"] = "test"

        r = await client.patch(
            f"/attempts/{attempt_id}/questions/{q['id']}",
            json=answers,
            cookies=student_cookies,
        )
        if r.status_code != 200:
            fail("guardar respuesta", r.text)
        ok("autoguardado de respuesta")

        # 8. Recuperar intento (simula recarga)
        r = await client.get(f"/attempts/{attempt_id}", cookies=student_cookies)
        if r.status_code != 200:
            fail("recuperar intento", r.text)
        ok("reanudar intento tras recarga")

        # 9. Entregar
        r = await client.post(f"/attempts/{attempt_id}/submit", cookies=student_cookies)
        if r.status_code != 200:
            fail("entregar examen", r.text)
        ok("entrega de examen")

        # 10. Idempotencia
        r2 = await client.post(f"/attempts/{attempt_id}/submit", cookies=student_cookies)
        if r2.status_code != 200:
            fail("segunda entrega", r2.text)
        ok("entrega idempotente")

        # 11. Resultado estudiante
        r = await client.get(f"/attempts/{attempt_id}/result", cookies=student_cookies)
        if r.status_code != 200:
            fail("resultado estudiante", r.text)
        result = r.json()
        ok(f"resultado: {result['percentage']}% ({result['correct_fields']}/{result['total_fields']} campos)")

        # 12. Profesor ve resultados
        r = await client.get("/admin/attempts", cookies=admin_cookies)
        if r.status_code != 200:
            fail("listado admin", r.text)
        items = r.json()["items"]
        if not any(i["id"] == attempt_id for i in items):
            fail("resultado visible para admin")
        ok("profesor ve el intento en resultados")

        # 13. Export CSV
        r = await client.get("/admin/attempts/export.csv", cookies=admin_cookies)
        if r.status_code != 200 or "text/csv" not in r.headers.get("content-type", ""):
            fail("export CSV", r.text[:200])
        ok(f"export CSV ({len(r.text)} bytes)")

    print("\n=== TODAS LAS PRUEBAS PASARON ===")
    print(f"\nFrontend: http://localhost:5173")
    print(f"API docs: http://localhost:8000/docs")
    print(f"\nCredenciales de prueba:")
    print(f"  Profesor:  {ADMIN_USER} / {ADMIN_PASS}")
    print(f"  Estudiante: {STUDENT_USER} / {STUDENT_TEMP}")


if __name__ == "__main__":
    asyncio.run(main())
