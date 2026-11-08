"""Run regression tests or a temporary demo API in a disposable PostgreSQL DB.

The configured incident database is only read to verify that its rows are unchanged.
No Docker volumes or existing records are removed. Requires a role with CREATEDB.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

from dotenv import dotenv_values
from sqlalchemy import create_engine, make_url, text
from sqlalchemy.exc import SQLAlchemyError

ROOT = Path(__file__).resolve().parents[1]


def snapshot(engine):
    with engine.connect() as connection:
        rows = connection.execute(text(
            'SELECT id, worker_id, violation, timestamp, status FROM incident ORDER BY id')).all()
    payload = json.dumps([tuple(row) for row in rows], default=str).encode()
    return {'count': len(rows), 'sha256': hashlib.sha256(payload).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve', action='store_true',
                        help='Serve a disposable demo API instead of running pytest; Ctrl+C removes only that temporary database')
    parser.add_argument('--port', type=int, default=8002)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    config = os.getenv('DATABASE_URL') or dotenv_values(
        ROOT / '.env').get('DATABASE_URL')
    if not config:
        parser.error('Set DATABASE_URL or configure the root .env first.')
    url = make_url(config)
    if url.get_backend_name() != 'postgresql':
        parser.error('This check requires a PostgreSQL DATABASE_URL.')
    source = create_engine(url)
    try:
        before = snapshot(source)
    except SQLAlchemyError:
        source.dispose()
        parser.exit(2, "Cannot connect to the configured PostgreSQL database. Check DATABASE_URL against the initialized database credentials. No test database was created and existing records were not modified.\n")
    name = 'safetruck_phase5_test_phase6_' + uuid.uuid4().hex[:10]
    admin = create_engine(url.set(database='postgres'),
                          isolation_level='AUTOCOMMIT')
    created = False
    report = {'mode': 'isolated demo API' if args.serve else 'pytest on isolated PostgreSQL',
              'source_before': before}
    exit_code = 0
    try:
        with admin.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{name}"'))
        created = True
        test_url = url.set(database=name).render_as_string(hide_password=False)
        if args.serve:
            os.environ['DATABASE_URL'] = test_url
            sys.path.insert(0, str(ROOT))
            import uvicorn
            print(
                f'DISPOSABLE TEST DATA ONLY: API http://127.0.0.1:{args.port}; database {name}', flush=True)
            print('Ctrl+C stops this API and removes its temporary database; the configured incident DB is preserved.', flush=True)
            uvicorn.run('backend.main:app', host='127.0.0.1',
                        port=args.port, log_level='warning')
        else:
            env = dict(os.environ, DATABASE_URL=test_url,
                       TEST_DATABASE_URL=test_url)
            outcome = subprocess.run(
                [sys.executable, '-m', 'pytest', '-q'], cwd=ROOT, env=env)
            exit_code = outcome.returncode
            report['pytest_exit_code'] = exit_code
        # Exercise database-backed read routes on the configured database without startup writes.
        if not args.serve:
            os.environ['DATABASE_URL'] = url.render_as_string(
                hide_password=False)
            sys.path.insert(0, str(ROOT))
            from backend.main import app
            from fastapi.testclient import TestClient
            client = TestClient(app)
            report['read_routes'] = {}
            for route in ['/health', '/api/incidents', '/api/dashboard/incidents', '/api/dashboard/statistics', '/api/dashboard/analytics']:
                response = client.get(route)
                report['read_routes'][route] = response.status_code
                if response.status_code != 200:
                    exit_code = 1
    finally:
        if created:
            with admin.connect() as connection:
                connection.execute(
                    text(f'DROP DATABASE "{name}" WITH (FORCE)'))
            report['temporary_database_removed'] = True
        after = snapshot(source)
        report['source_after'] = after
        report['existing_rows_unchanged'] = before == after
        if before != after:
            exit_code = 1
        source.dispose()
        admin.dispose()
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
