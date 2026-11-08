"""Validate the existing checkpoint on a local Construction-PPE validation split.

No training, dataset downloads, image output, or checkpoint changes are performed.
Run in the project's ML environment; see docs/model-evaluation.md.
"""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, required=True,
                        help='Local Construction-PPE root with images/val and labels/val')
    parser.add_argument('--model', type=Path, default=Path('models/best.pt'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--imgsz', type=int, default=416)
    args = parser.parse_args()
    root = args.dataset.resolve()
    images = sorted(path for path in (root / 'images/val').iterdir()
                    if path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'})
    labels = sorted((root / 'labels/val').glob('*.txt'))
    if not images or not labels:
        parser.error(
            'Existing validation images and labels are required; downloads are disabled.')
    from ultralytics import YOLO, __version__
    import torch
    import yaml
    model = YOLO(str(args.model))
    # Construction-PPE label IDs must match the checkpoint's original 12-class mapping.
    spec = {'path': str(root), 'train': 'images/train',
            'val': 'images/val', 'names': model.names}
    fingerprint = hashlib.sha256()
    for path in images + labels:
        fingerprint.update(str(path.relative_to(root)).encode())
        fingerprint.update(path.read_bytes())
    with tempfile.TemporaryDirectory(prefix='safetruck-validation-') as directory:
        config = Path(directory) / 'data.yaml'
        config.write_text(yaml.safe_dump(spec))
        metrics = model.val(data=str(config), imgsz=args.imgsz, batch=2, device='cpu', workers=0,
                            plots=False, save=False, project=directory, name='val', exist_ok=True)
        per_class = []
        for index, class_id in enumerate(metrics.box.ap_class_index):
            per_class.append({'class_id': int(class_id), 'name': model.names[int(class_id)],
                              'precision': float(metrics.box.p[index]), 'recall': float(metrics.box.r[index]),
                              'mAP50': float(metrics.box.ap50[index]), 'mAP50_95': float(metrics.box.ap[index])})
        checkpoint = model.ckpt
        result = {'source': 'fresh local validation, not training', 'ultralytics': __version__, 'torch': torch.__version__,
                  'model_sha256': hashlib.sha256(args.model.read_bytes()).hexdigest(),
                  'dataset': 'Construction-PPE local validation split', 'validation_images': len(images),
                   'validation_label_files': len(labels), 'dataset_sha256': fingerprint.hexdigest(),
                  'device': 'cpu', 'imgsz': args.imgsz, 'batch': 2, 'workers': 0,
                  'aggregate': {key: float(value) for key, value in metrics.results_dict.items()},
                  'per_class': per_class, 'checkpoint_metrics': checkpoint.get('train_metrics'),
                  'training_history': checkpoint.get('train_results'),
                  'training_configuration': {key: checkpoint.get('train_args', {}).get(key) for key in
                                             ['epochs', 'imgsz', 'batch', 'device', 'optimizer', 'seed']}}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print('Saved actual validation results:', args.output)


if __name__ == '__main__':
    main()
