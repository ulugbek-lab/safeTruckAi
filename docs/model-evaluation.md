# Model evaluation

Evaluated locally on 2026-11-08. No retraining was performed. Metrics below are measured values, expressed on a 0–1 scale.

## Artifact and protocol

- Checkpoint: `models/best.pt`; SHA-256 `e159e97cd73705b2cb7b8ffc0c1de1f68e34a0bb84d032ee6a9bf8b201a77d58`.
- Validation split: Construction-PPE, 200 images, 200 label files, 2,961 labeled objects across 12 classes.
- Dataset fingerprint (relative validation image/label names and contents): `b6b9880b9a51fc080ffff273fbfcae09f951460f9d2b5dff8174929456b3512e`.
- Python 3.11.18; Ultralytics 8.4.204; PyTorch 2.15.0; CPU validation, batch 2, workers 0, plots/image saves disabled.
- The same checkpoint and split were evaluated at 416 pixels (training resolution) and 320 pixels (detector runtime resolution). Validation uses Ultralytics' evaluation defaults, not the application's fixed 0.20 PPE confidence threshold.
- These are object-detection metrics. They do not measure ByteTrack identity continuity, PPE-to-worker association, the eight-frame alert logic, end-to-end incident accuracy, or performance at a new workplace.

## Aggregate results: all 12 classes

| Source | Precision | Recall | mAP50 | mAP50–95 |
| --- | ---: | ---: | ---: | ---: |
| Saved checkpoint | 0.783480 | 0.515120 | 0.569230 | 0.369690 |
| Fresh validation, 416 pixels | 0.784590 | 0.515109 | 0.568909 | 0.369979 |
| Fresh validation, 320 pixels | 0.744758 | 0.447814 | 0.492896 | 0.305100 |

## 416-pixel validation: application PPE classes

| Class | Instances | Precision | Recall | mAP50 | mAP50–95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `helmet` | 294 | 0.920184 | 0.632653 | 0.677659 | 0.488315 |
| `vest` | 340 | 0.846408 | 0.729412 | 0.787998 | 0.574629 |
| `no_helmet` | 179 | 0.652608 | 0.351955 | 0.417262 | 0.253868 |
| `no_vest` | 130 | 0.818543 | 0.515385 | 0.547758 | 0.337500 |

## 320-pixel validation: application PPE classes

| Class | Instances | Precision | Recall | mAP50 | mAP50–95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `helmet` | 294 | 0.904775 | 0.564626 | 0.610446 | 0.425218 |
| `vest` | 340 | 0.820166 | 0.629412 | 0.700033 | 0.497822 |
| `no_helmet` | 179 | 0.715288 | 0.350893 | 0.390648 | 0.231672 |
| `no_vest` | 130 | 0.795818 | 0.469231 | 0.507057 | 0.321220 |

## Training history and interpretation

- The checkpoint retains a ten-row training history and the configuration: ten epochs, image size 416, batch 2, MPS, AdamW, seed 0. The saved training configuration has `project=runs/safetruck`, while the current training script uses `project=safeTruckAi`; the checkpoint is the source for this run's provenance.
- The exported checkpoint has `epoch=-1` and no optimizer/best-fitness value. Its saved metrics match history row 9; that row has the highest retained mAP50–95 (0.36969), versus 0.36903 at epoch 10. This is evidence about the saved history, not a newly recovered active epoch field.
- Original standalone results CSVs/plots were not located in the repository or searched user locations. Aggregate metrics and all ten epoch rows were recovered directly from the checkpoint and retained in the JSON artifact.
- The checkpoint has 12 classes: helmet, gloves, vest, boots, goggles, Person, no_helmet, no_goggle, no_gloves, no_boots, forklift, and no_vest. The application selects four PPE classes; its general model tracks persons separately. The aggregate is not a four-class-only score.
- At 320 pixels, no_helmet recall is approximately 35.1% and no_vest recall approximately 46.9% under the validator's protocol. Missed missing-PPE objects are a substantial weakness. False positives are also possible.
- Ten epochs is a short fine-tuning run. The retained metrics do not establish convergence, robust calibration, transfer to new sites, or independent test-set performance. No held-out workplace/video benchmark or confidence interval was measured. A temporal confirmation rule cannot recover all missed objects and may also delay alerts.
- The 320-pixel aggregate mAP50 (0.492896) is lower than the 416-pixel result (0.568909) on this split. These are resolution-specific results, not a measured end-to-end FPS/accuracy tradeoff.
- Small differences between saved and fresh 416-pixel metrics are reported rather than rounded away; CPU evaluation, model fusion, and numeric execution can differ from the original training-time validation. No single cause was established.

## Real inference/tracking smoke check

The existing models also processed two local validation images using the actual `mps` device and runtime parameters: person model `classes=[0]`, persistent ByteTrack, image size 320, confidence 0.25; PPE model image size 320, confidence 0.20. The first image produced one tracked person with a tracking ID and nine PPE boxes; the second produced zero tracked people and six PPE boxes. Both calls completed. This is an execution smoke check, not a tracking accuracy score or video test.

## Reproduce

In the working ML environment, using an already available Construction-PPE dataset with the original 12-class label mapping:

```bash
python scripts/evaluate_model.py --dataset /path/to/construction-ppe --imgsz 416 --output docs/model-evaluation.json
python scripts/evaluate_model.py --dataset /path/to/construction-ppe --imgsz 320 --output docs/model-evaluation-320.json
```

The development dataset was located at `/opt/homebrew/datasets/construction-ppe`. The script requires existing local images/labels, creates a temporary dataset YAML without a download instruction, runs CPU validation, and writes metrics/provenance JSON. It does not train or overwrite weights. Use only trusted model checkpoints, and use the correct dataset label ordering when reproducing results.

Raw artifacts: [416-pixel results](model-evaluation.json), [320-pixel results](model-evaluation-320.json). All 12 per-class metrics and the retained ten-epoch history are included.
