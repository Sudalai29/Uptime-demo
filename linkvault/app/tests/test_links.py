import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)


# ── Health ─────────────────────────────────────────────────
def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ── Mock DynamoDB for all link tests ───────────────────────
MOCK_LINK = {
    "id": "abc-123",
    "url": "https://example.com",
    "title": "Example",
    "tags": ["python", "devops"],
    "notes": "a test link",
    "created_at": "2025-01-01T00:00:00",
    "updated_at": "2025-01-01T00:00:00",
}


@pytest.fixture
def mock_table():
    with patch("app.routes.links.get_table") as mock:
        table = MagicMock()
        mock.return_value = table
        yield table


def test_get_links(mock_table):
    mock_table.scan.return_value = {"Items": [MOCK_LINK]}
    response = client.get("/links/")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Example"


def test_get_link_found(mock_table):
    mock_table.get_item.return_value = {"Item": MOCK_LINK}
    response = client.get("/links/abc-123")
    assert response.status_code == 200
    assert response.json()["id"] == "abc-123"


def test_get_link_not_found(mock_table):
    mock_table.get_item.return_value = {}
    response = client.get("/links/nonexistent")
    assert response.status_code == 404


def test_create_link(mock_table):
    mock_table.put_item.return_value = {}
    payload = {"url": "https://new.com", "title": "New Link", "tags": ["aws"]}
    response = client.post("/links/", json=payload)
    assert response.status_code == 201
    assert response.json()["url"] == "https://new.com"
    assert "id" in response.json()


def test_delete_link(mock_table):
    mock_table.get_item.return_value = {"Item": MOCK_LINK}
    mock_table.delete_item.return_value = {}
    response = client.delete("/links/abc-123")
    assert response.status_code == 204


def test_delete_link_not_found(mock_table):
    mock_table.get_item.return_value = {}
    response = client.delete("/links/nonexistent")
    assert response.status_code == 404


def test_get_all_tags(mock_table):
    mock_table.scan.return_value = {"Items": [MOCK_LINK]}
    response = client.get("/links/tags/all")
    assert response.status_code == 200
    assert "python" in response.json()
    assert "devops" in response.json()
