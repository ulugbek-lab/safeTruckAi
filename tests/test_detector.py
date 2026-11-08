"""Detector behavior with no webcam, model downloads, or production API writes."""
import importlib
import sys
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
import requests


@pytest.fixture
def detector(monkeypatch):
    module = importlib.import_module('main')
    module.worker_states.clear()
    module.last_alert_times.clear()
    monkeypatch.setattr(module, 'API_URL', 'http://isolated-test.invalid/api/incidents')
    return module


def state():
    return {'no_helmet': 0, 'no_vest': 0, 'missed': {'no_helmet': 0, 'no_vest': 0}, 'alerted': set(), 'last_seen': 0}


def test_import_has_no_camera_or_model_side_effects(detector):
    assert not hasattr(detector, 'cap')
    assert not hasattr(detector, 'person_model')
    assert not hasattr(detector, 'ppe_model')


def test_equipment_association_regions(detector):
    person = (0, 0, 100, 200)
    helmet = (40, 10, 60, 30)
    vest = (30, 90, 70, 150)
    assert detector.in_region(helmet, person, 0, .35)
    assert not detector.in_region(vest, person, 0, .35)
    assert detector.in_region(vest, person, .25, .80)
    assert not detector.in_region((110, 0, 130, 30), person, 0, .35)


def test_confirmation_tolerance_reset_and_present_priority(detector):
    worker = state()
    for _ in range(detector.ALERT_FRAMES - 1):
        detector.update_violation(worker, 'no_helmet', 'helmet', {'no_helmet'})
    assert worker['no_helmet'] == 7
    # Missing observations do not immediately erase positive missing-PPE evidence.
    for _ in range(detector.MAX_MISSED_FRAMES - 1):
        detector.update_violation(worker, 'no_helmet', 'helmet', set())
    detector.update_violation(worker, 'no_helmet', 'helmet', {'no_helmet'})
    assert worker['no_helmet'] == detector.ALERT_FRAMES
    worker['alerted'].add('no_helmet')
    detector.update_violation(worker, 'no_helmet', 'helmet', {'helmet', 'no_helmet'})
    assert worker['no_helmet'] == 0 and not worker['alerted']
    worker['no_helmet'] = 8
    worker['alerted'].add('no_helmet')
    for _ in range(detector.MAX_MISSED_FRAMES):
        detector.update_violation(worker, 'no_helmet', 'helmet', set())
    assert worker['no_helmet'] == 0 and not worker['alerted']


def test_logging_cooldown_is_per_track_and_violation(detector, monkeypatch):
    now = [100.0]
    monkeypatch.setattr(detector.time, 'monotonic', lambda: now[0])
    post = Mock(return_value=SimpleNamespace(raise_for_status=Mock()))
    monkeypatch.setattr(detector.requests, 'post', post)
    assert detector.save_event(7, 'no_helmet')
    assert not detector.save_event(7, 'no_helmet')
    assert detector.save_event(7, 'no_vest')
    assert detector.save_event(8, 'no_helmet')
    now[0] += detector.ALERT_COOLDOWN
    assert detector.save_event(7, 'no_helmet')
    assert post.call_count == 4
    post.assert_called_with(detector.API_URL, json={'worker_id': 7, 'violation': 'no_helmet'}, timeout=3)


def test_api_failure_does_not_consume_cooldown(detector, monkeypatch):
    post = Mock(side_effect=requests.Timeout('isolated timeout'))
    monkeypatch.setattr(detector.requests, 'post', post)
    assert not detector.save_event(7, 'no_helmet')
    assert (7, 'no_helmet') not in detector.last_alert_times
    post.side_effect = None
    post.return_value = SimpleNamespace(raise_for_status=Mock())
    assert detector.save_event(7, 'no_helmet')


def test_full_loop_confirms_once_and_cleans_up(detector, monkeypatch):
    """Exercise the real loop with controlled frames; this is not model accuracy evidence."""
    class Box:
        id = [17]
        cls = [0]
        def __init__(self, coordinates):
            self.xyxy = [SimpleNamespace(tolist=lambda: coordinates)]
    person = SimpleNamespace(boxes=[Box([0, 0, 100, 200])])
    equipment = SimpleNamespace(boxes=[Box([40, 10, 60, 30])])
    person_model = SimpleNamespace(track=Mock(return_value=[person]))
    ppe_model = SimpleNamespace(predict=Mock(return_value=[equipment]), names={0: 'no_helmet'})
    # Successful frame reads stop deterministically; no actual camera or OpenCV import.
    camera = SimpleNamespace(set=Mock(), isOpened=lambda: True,
                             read=Mock(side_effect=[(True, object())] * 12 + [(False, None)]), release=Mock())
    cv2 = SimpleNamespace(VideoCapture=Mock(return_value=camera), CAP_PROP_FRAME_WIDTH=3,
                          CAP_PROP_FRAME_HEIGHT=4, FONT_HERSHEY_SIMPLEX=0,
                          flip=lambda frame, _: frame, rectangle=Mock(), putText=Mock(),
                          imshow=Mock(), waitKey=lambda _: -1, destroyAllWindows=Mock())
    monkeypatch.setitem(sys.modules, 'cv2', cv2)
    monkeypatch.setitem(sys.modules, 'torch', SimpleNamespace(backends=SimpleNamespace(mps=SimpleNamespace(is_available=lambda: False))))
    monkeypatch.setitem(sys.modules, 'ultralytics', SimpleNamespace(YOLO=Mock(side_effect=[person_model, ppe_model])))
    post = Mock(return_value=SimpleNamespace(raise_for_status=Mock()))
    monkeypatch.setattr(detector.requests, 'post', post)
    detector.worker_states[99] = {**state(), 'last_seen': detector.time.monotonic() - detector.WORKER_TIMEOUT - 1}
    detector.run()
    assert 99 not in detector.worker_states
    assert post.call_count == 1  # Sustained absence remains latched after confirmation.
    assert detector.worker_states[17]['alerted'] == {'no_helmet'}
    assert person_model.track.call_count == 12
    assert ppe_model.predict.call_count == 12
    kwargs = person_model.track.call_args.kwargs
    assert kwargs['classes'] == [0] and kwargs['tracker'] == 'custom_tracker.yaml'
    assert kwargs['persist'] and kwargs['imgsz'] == 320 and kwargs['device'] == 'cpu'
    assert ppe_model.predict.call_args.kwargs['conf'] == .20
    camera.release.assert_called_once()
    cv2.destroyAllWindows.assert_called_once()
