import app as app_module


def test_public_api_requires_http_revalidation(monkeypatch):
    monkeypatch.setitem(app_module.app.config, "DEBUG", False)

    response = app_module.app.test_client().get("/api/seasons")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache, must-revalidate"


def test_frontend_revalidation_uses_bearer_secret(monkeypatch):
    captured = {}

    class SuccessfulResponse:
        @staticmethod
        def raise_for_status():
            return None

    def fake_post(url, *, headers, timeout):
        captured.update(url=url, headers=headers, timeout=timeout)
        return SuccessfulResponse()

    monkeypatch.setattr(app_module, "REVALIDATE_SECRET", "test-secret")
    monkeypatch.setattr(
        app_module,
        "FRONTEND_REVALIDATE_URL",
        "https://example.test/api/revalidate",
    )
    monkeypatch.setattr(app_module.http_requests, "post", fake_post)

    assert app_module._revalidate_frontend_data() is True
    assert captured == {
        "url": "https://example.test/api/revalidate",
        "headers": {"Authorization": "Bearer test-secret"},
        "timeout": 5,
    }


def test_frontend_revalidation_is_disabled_without_secret(monkeypatch):
    monkeypatch.setattr(app_module, "REVALIDATE_SECRET", "")

    assert app_module._revalidate_frontend_data() is False
