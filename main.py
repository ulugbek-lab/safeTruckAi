
import cv2
from ultralytics import YOLO

# 1. Load the pretrained YOLO model
model = YOLO("yolo26n.pt")

# 2. Open the webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

while True:
    success, frame = cap.read()

    if not success:
        break

    # 3. Mirror the camera
    frame = cv2.flip(frame, 1)

    # 4. Detect people using YOLO
    results = model.predict(
        source=frame,
        classes=[0],
        conf=0.5,
        verbose=False
    )

    # 5. Extract detection results
    boxes = results[0].boxes

    # 6. Draw a rectangle around each person
    for box in boxes:
        x1, y1, x2, y2 = map(
            int, box.xyxy[0].tolist()
        )

        confidence = float(box.conf[0])

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Person {confidence:.0%}",
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

    # 7. Display the result
    cv2.imshow("SafeTruck - Person Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
