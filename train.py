import torch
from ultralytics import YOLO

device = "mps" if torch.backends.mps.is_available() else "cpu"

print(f"Training on: {device}")

model = YOLO("yolo26n.pt")

model.train(
    data="construction-ppe.yaml",
    epochs=10,
    imgsz=416,
    batch=2,
    device=device,
    workers=0,
    cache=False,
    project="safeTruckAi",
    name="ppe"
)
