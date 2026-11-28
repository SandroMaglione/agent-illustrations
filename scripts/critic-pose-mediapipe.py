#!/usr/bin/env python3
"""
Pose keypoints for scripts/critic.ts, from MediaPipe Pose Landmarker. Optional: the critic runs without it.

    pip install mediapipe
    node scripts/critic.ts art.png --pose-cmd "python3 scripts/critic-pose-mediapipe.py {in}"

Prints {"normalized": true, "points": {"nose": [x, y, score], ...}} for the most prominent figure in the PNG given.
The model (pose_landmarker_full.task, about 9 MB) is downloaded once into ~/.cache/critic/ unless CRITIC_MEDIAPIPE_MODEL
points at a .task file. MediaPipe is trained on photos: on stylized anime it finds the torso and limbs well and the face
roughly; the critic only uses points scored 0.3 or higher.
"""
import json
import os
import sys
import urllib.request

NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right", "left_shoulder", "right_shoulder", "left_elbow",
    "right_elbow", "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index", "right_index",
    "left_thumb", "right_thumb", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
    "left_heel", "right_heel", "left_big_toe", "right_big_toe",
]
URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"


def model_path() -> str:
    env = os.environ.get("CRITIC_MEDIAPIPE_MODEL")
    if env:
        return env
    path = os.path.join(os.path.expanduser("~"), ".cache", "critic", "pose_landmarker_full.task")
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print(f"downloading the MediaPipe pose model to {path}", file=sys.stderr)
        urllib.request.urlretrieve(URL, path + ".part")
        os.replace(path + ".part", path)
    return path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: critic-pose-mediapipe.py <image.png>", file=sys.stderr)
        return 2
    try:
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions, vision
    except ImportError:
        print("mediapipe is not installed: pip install mediapipe", file=sys.stderr)
        return 3
    options = vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=model_path()), running_mode=vision.RunningMode.IMAGE, num_poses=1)
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        result = landmarker.detect(mp.Image.create_from_file(sys.argv[1]))
    if not result.pose_landmarks:
        print(json.dumps({"normalized": True, "points": {}}))
        return 0
    points = {name: [lm.x, lm.y, float(lm.visibility if lm.visibility is not None else 1.0)] for name, lm in zip(NAMES, result.pose_landmarks[0])}
    print(json.dumps({"normalized": True, "points": points}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
