from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.spa import STATIC_DIR, mount_spa


def test_mount_spa_serves_index_and_fallback(tmp_path, monkeypatch):
    static = tmp_path / "static"
    assets = static / "assets"
    assets.mkdir(parents=True)
    (static / "index.html").write_text("<html>ok</html>", encoding="utf-8")
    (static / "favicon.svg").write_text("<svg></svg>", encoding="utf-8")
    (assets / "app.js").write_text("console.log(1)", encoding="utf-8")

    monkeypatch.setattr("app.spa.STATIC_DIR", static)

    app = FastAPI()

    @app.get("/api/v1/health/live")
    async def live():
        return {"status": "ok"}

    mount_spa(app)
    client = TestClient(app)

    assert client.get("/api/v1/health/live").json() == {"status": "ok"}
    assert client.get("/").text == "<html>ok</html>"
    assert client.get("/admin").text == "<html>ok</html>"
    assert client.get("/admin/dashboard").text == "<html>ok</html>"
    assert client.get("/favicon.svg").text == "<svg></svg>"
    assert client.get("/assets/app.js").text == "console.log(1)"


def test_mount_spa_noop_without_static(monkeypatch):
    missing = Path("/tmp/does-not-exist-spa-static")
    monkeypatch.setattr("app.spa.STATIC_DIR", missing)
    app = FastAPI()
    mount_spa(app)
    client = TestClient(app)
    assert client.get("/").status_code == 404
