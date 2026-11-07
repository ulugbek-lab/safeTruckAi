
import time
import cv2
import torch
from ultralytics import YOLO

# Select Apple GPU if available
device = "mps" if torch.backends.mps.is_available() else "cpu"

print("Using device:", device, flush=True)

# Load the trained model
model = YOLO("models/best.pt")

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

# Reduce camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("Camera opened successfully", flush=True)

try:
    while True:
        success, frame = cap.read()

        if not success:
            print("Failed to read camera frame")
            break

        frame = cv2.flip(frame, 1)

        start_time = time.perf_counter()

        # Run YOLO inference
        results = model.predict(
            source=frame,
            imgsz=320,
            conf=0.15,
            device=device,
            verbose=False
        )

        elapsed = time.perf_counter() - start_time

        print(
            f"Inference time: {elapsed:.2f}s | "
            f"Detections: {len(results[0].boxes)}",
            flush=True
        )

        # Draw results
        annotated_frame = results[0].plot()

        cv2.imshow(
            "SafeTruck AI - PPE Detection",
            annotated_frame
        )

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
