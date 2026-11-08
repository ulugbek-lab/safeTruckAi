"""Contract regression tests. Default: isolated in-memory SQLite, never local data.

Optional TEST_DATABASE_URL must name a disposable *_phase5_test_* database.
"""
from backend.models import Incident
from backend.database import get_session
import backend.main as main
from sqlmodel.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy import make_url
from fastapi.testclient import TestClient
import pytest
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite://")


@pytest.fixture
def client(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL", "sqlite://")
    if url != "sqlite://":
        assert "_phase5_test_" in (
            make_url(url).database or ""), "Use a disposable test database"
    options = {"connect_args": {"check_same_thread": False},
               "poolclass": StaticPool} if url == "sqlite://" else {"connect_args": {"options": "-c timezone=Asia/Seoul"}}
    engine = create_engine(url, **options)
    SQLModel.metadata.create_all(engine)

    def session():
        with Session(engine) as db:
            yield db
    monkeypatch.setattr(main, "create_db_and_tables", lambda: None)
    main.app.dependency_overrides[get_session] = session
    with TestClient(main.app) as test_client:
        yield test_client, engine
    main.app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(engine)
    engine.dispose()


def seed(engine, count=105):
    today = datetime.now(timezone.utc).replace(
        hour=12, minute=0, second=0, microsecond=0)
    with Session(engine) as db:
        db.add_all([Incident(worker_id=i, violation="no_helmet" if i % 2 == 0 else "no_vest",
                             status="pending" if i % 3 == 0 else "reviewed", timestamp=today - timedelta(days=i % 4)) for i in range(count)])
        db.commit()


def test_empty_database(client):
    api, _ = client
    assert api.get('/api/dashboard/statistics').json() == {
        "total": 0, "pending": 0, "no_helmet": 0, "no_vest": 0}
    assert api.get('/api/dashboard/incidents').json() == {
        "items": [], "total": 0, "offset": 0, "limit": 10}
    analytics = api.get('/api/dashboard/analytics').json()
    assert len(analytics['daily']) == 14
    assert all(day['count'] == 0 for day in analytics['daily'])
    assert analytics['distribution'] == []
    assert analytics['timezone'] == 'UTC'


def test_full_table_statistics_and_legacy_contract(client):
    api, engine = client
    seed(engine)
    assert api.get('/api/dashboard/statistics').json() == {
        "total": 105, "pending": 35, "no_helmet": 53, "no_vest": 52}
    legacy = api.get('/api/incidents').json()
    assert isinstance(legacy, list) and len(legacy) == 50
    assert legacy[0]['id'] > legacy[-1]['id']
    assert len(api.get('/api/incidents?limit=100').json()) == 100


def test_filter_pagination_and_sort(client):
    api, engine = client
    seed(engine)
    query = '/api/dashboard/incidents?violation=no_helmet&status=pending&limit=7&sort=oldest'
    first = api.get(query).json()
    second = api.get(query + '&offset=7').json()
    assert first['total'] == 18
    assert len(first['items']) == len(second['items']) == 7
    assert {item['id'] for item in first['items']}.isdisjoint(
        {item['id'] for item in second['items']})
    combined = first['items'] + second['items']
    assert all(item['violation'] == 'no_helmet' and item['status']
               == 'pending' for item in combined)
    keys = [(item['timestamp'], item['id']) for item in combined]
    assert keys == sorted(keys)
    newest = api.get(
        '/api/dashboard/incidents?sort=newest&limit=100').json()['items']
    keys = [(item['timestamp'], item['id']) for item in newest]
    assert keys == sorted(keys, reverse=True)
    assert api.get(
        '/api/dashboard/incidents?offset=9999').json()['items'] == []


@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'offset=-1', 'sort=bad', 'violation=helmet', 'status=approved'])
def test_invalid_list_query(client, query):
    api, _ = client
    assert api.get('/api/dashboard/incidents?' + query).status_code == 422


@pytest.mark.parametrize('days', [0, 91])
def test_invalid_analytics_window(client, days):
    api, _ = client
    assert api.get('/api/dashboard/analytics',
                   params={'days': days}).status_code == 422


def test_daily_utc_boundaries_and_zero_filling(client):
    api, engine = client
    today = datetime.now(timezone.utc).date()
    midnight = datetime.combine(
        today, datetime.min.time(), tzinfo=timezone.utc)
    with Session(engine) as db:
        db.add_all([Incident(worker_id=i, violation='no_helmet', timestamp=stamp) for i, stamp in enumerate([
            midnight - timedelta(microseconds=1), midnight, midnight +
            timedelta(days=1), midnight - timedelta(days=30)
        ])])
        db.commit()
    body = api.get('/api/dashboard/analytics?days=3').json()
    assert [item['count'] for item in body['daily']] == [0, 1, 1]
    assert body['distribution'] == [{'violation': 'no_helmet', 'count': 4}]
    assert body['daily'][-1]['date'] == today.isoformat()
    timestamp = api.get('/api/incidents/1').json()['timestamp']
    assert datetime.fromisoformat(timestamp).utcoffset() == timedelta(0)


def test_creation_review_persistence_and_validation(client):
    api, _ = client
    result = api.post('/api/incidents',
                      json={'worker_id': 8, 'violation': 'no_vest'})
    assert result.status_code == 201
    incident = result.json()
    assert incident['status'] == 'pending'
    assert incident['timestamp'].endswith('+00:00')
    for status in ['reviewed', 'dismissed', 'pending']:
        response = api.patch(
            f"/api/incidents/{incident['id']}", json={'status': status})
        assert response.status_code == 200
        assert api.get(
            f"/api/incidents/{incident['id']}").json()['status'] == status
        assert api.get(
            '/api/dashboard/statistics').json()['pending'] == (1 if status == 'pending' else 0)
    for payload in [{'status': 'approved'}, {'status': 'reviewed', 'worker_id': 9}, {}]:
        assert api.patch('/api/incidents/1', json=payload).status_code == 422
    for payload in [{'worker_id': -1, 'violation': 'no_vest'}, {'worker_id': 1, 'violation': 'bad'}, {'worker_id': 1, 'violation': 'no_vest', 'status': 'reviewed'}]:
        assert api.post('/api/incidents', json=payload).status_code == 422
    assert api.patch('/api/incidents/999',
                     json={'status': 'reviewed'}).status_code == 404
    assert api.get('/api/incidents/999').status_code == 404


def test_database_outage_returns_safe_error(client):
    api, _ = client

    def failed_session():
        raise OperationalError('sensitive SQL', {},
                               Exception('secret connection string'))
        yield
    main.app.dependency_overrides[get_session] = failed_session
    response = api.get('/api/dashboard/statistics')
    assert response.status_code == 503
    assert response.json() == {
        'detail': 'Incident storage is temporarily unavailable. Please try again.'}
    assert 'secret' not in response.text
