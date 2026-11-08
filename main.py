
import os
import time
import requests


# ==========================
# Configuration
# ==========================
API_URL = os.getenv("SAFETRUCK_API_URL", "http://127.0.0.1:8000/api/incidents")

ALERT_FRAMES = 8
ALERT_COOLDOWN = 30
MAX_MISSED_FRAMES = 10
WORKER_TIMEOUT = 10

# Store worker detection history
worker_states = {}

# Store last alert time per worker and violation
last_alert_times = {}


# ==========================
# Helper Functions
# ==========================

def in_region(item_box, person_box, top, bottom):
    """Check if an object's center is inside a worker's body region."""

    x1, y1, x2, y2 = person_box
    a, b, c, d = item_box

    center_x = (a + c) / 2
    center_y = (b + d) / 2

    height = y2 - y1

    return (
        x1 <= center_x <= x2
        and y1 + height * top <= center_y <= y1 + height * bottom
    )


def save_event(worker_id, violation):
    """Record a possible PPE violation through FastAPI."""

    now = time.monotonic()
    alert_key = (worker_id, violation)

    last_alert = last_alert_times.get(
        alert_key, float("-inf")
    )

    if now - last_alert < ALERT_COOLDOWN:
        return False

    payload = {
        "worker_id": worker_id,
        "violation": violation
    }

    try:
        response = requests.post(
            API_URL,
            json=payload,
            timeout=3
        )

        response.raise_for_status()

    except requests.RequestException as error:
        print(f"Failed to save incident: {error}")
        return False

    last_alert_times[alert_key] = now

    print(
        f"ALERT: Worker #{worker_id} - {violation}"
    )

    return True


def update_violation(state, missing, present, detected):
    """Update missing-equipment evidence across frames."""

    if missing in detected and present not in detected:

        state["missed"][missing] = 0
        state[missing] += 1

    elif present in detected:

        state["missed"][missing] = 0
        state[missing] = 0
        state["alerted"].discard(missing)

    else:

        state["missed"][missing] += 1

        if state["missed"][missing] >= MAX_MISSED_FRAMES:
            state[missing] = 0
            state["alerted"].discard(missing)


def run():
    """Run the unchanged two-model camera pipeline; imports stay safe for tests."""
    import cv2
    import torch
    from ultralytics import YOLO

    device = "mps" if torch.backends.mps.is_available() else "cpu"

    # General YOLO model for tracking workers
    person_model = YOLO("yolo26n.pt")

    # Custom-trained model for PPE detection
    ppe_model = YOLO("models/best.pt")

    # ==========================
    # Webcam Setup
    # ==========================

    cap = cv2.VideoCapture(0)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        cap.release()
        raise RuntimeError("Cannot open webcam")

    print(f"SafeTruck AI running on {device}")

    # ==========================
    # Main Detection Loop
    # ==========================

    try:
        while True:

            success, frame = cap.read()

            if not success:
                break

            frame = cv2.flip(frame, 1)

            # STEP 1: Detect and track people only
            person_result = person_model.track(
                source=frame,
                persist=True,
                tracker="custom_tracker.yaml",
                classes=[0],
                imgsz=320,
                conf=0.25,
                device=device,
                verbose=False
            )[0]

            # STEP 2: Detect protective equipment separately
            ppe_result = ppe_model.predict(
                source=frame,
                imgsz=320,
                conf=0.20,
                device=device,
                verbose=False
            )[0]

            people = []
            equipment = []

            # STEP 3: Collect tracked workers
            for box in person_result.boxes:

                if box.id is None:
                    continue

                coords = list(map(
                    int,
                    box.xyxy[0].tolist()
                ))

                people.append({
                    "id": int(box.id[0]),
                    "box": coords
                })

            # STEP 4: Collect PPE detections
            for box in ppe_result.boxes:

                name = ppe_model.names[int(box.cls[0])]

                if name not in (
                    "helmet",
                    "vest",
                    "no_helmet",
                    "no_vest"
                ):
                    continue

                coords = list(map(
                    int,
                    box.xyxy[0].tolist()
                ))

                equipment.append({
                    "name": name,
                    "box": coords
                })

            # STEP 5: Analyze each tracked worker
            for person in people:

                worker_id = person["id"]
                person_box = person["box"]

                state = worker_states.setdefault(
                    worker_id,
                    {
                        "no_helmet": 0,
                        "no_vest": 0,
                        "missed": {
                            "no_helmet": 0,
                            "no_vest": 0
                        },
                        "alerted": set(),
                        "last_seen": time.monotonic()
                    }
                )

                state["last_seen"] = time.monotonic()

                detected = set()

                # Match PPE detections to worker body regions
                for item in equipment:

                    if item["name"] in (
                        "helmet",
                        "no_helmet"
                    ):
                        top, bottom = 0.0, 0.35

                    else:
                        top, bottom = 0.25, 0.80

                    if in_region(
                        item["box"],
                        person_box,
                        top,
                        bottom
                    ):
                        detected.add(item["name"])

                # STEP 6: Check possible PPE violations
                for missing, present in [
                    ("no_helmet", "helmet"),
                    ("no_vest", "vest")
                ]:

                    update_violation(
                        state,
                        missing,
                        present,
                        detected
                    )

                    if (
                        state[missing] >= ALERT_FRAMES
                        and missing not in state["alerted"]
                    ):

                        if save_event(worker_id, missing):
                            state["alerted"].add(missing)

                # STEP 7: Display worker tracking status
                has_alert = bool(state["alerted"])

                color = (
                    (0, 0, 255)
                    if has_alert
                    else (0, 255, 255)
                )

                x1, y1, x2, y2 = person_box

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    color,
                    2
                )

                label = f"Worker #{worker_id}"

                if has_alert:
                    label += " - REVIEW PPE"

                cv2.putText(
                    frame,
                    label,
                    (x1, max(y1 - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    color,
                    2
                )

            # STEP 8: Remove inactive worker states
            now = time.monotonic()

            for worker_id in list(worker_states):

                if (
                    now - worker_states[worker_id]["last_seen"]
                    > WORKER_TIMEOUT
                ):
                    del worker_states[worker_id]

            # STEP 9: Display webcam
            cv2.imshow(
                "SafeTruck AI - Safety Monitoring",
                frame
            )

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
