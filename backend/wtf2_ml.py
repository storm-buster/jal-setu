from __future__ import annotations

import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    # backend/ is one level below repo root.
    return Path(__file__).resolve().parents[1]


def _ensure_repo_root_on_syspath() -> None:
    root = str(_repo_root())
    if root not in sys.path:
        sys.path.insert(0, root)


@dataclass
class MlPrediction:
    risk_class: int
    risk_label: str
    probabilities: dict[str, float]
    confidence: float


class Wtf2Model:
    """Lazy loader for the ML model from repository root.

    This adapter is intentionally defensive: if ML deps are not installed, the backend
    should still start and fall back to the existing mocked FLOOD_DATA.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self._model_path = model_path or (_repo_root() / "flood_risk_model.pkl")
        self._model: Any = None
        self._load_error: Optional[str] = None
        self._loaded = False

    @property
    def model_path(self) -> Path:
        return self._model_path

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    def load(self) -> None:
        if self._loaded:
            return

        if not self._model_path.exists():
            self._load_error = f"model file not found: {self._model_path}"
            logger.warning(self._load_error)
            self._loaded = True
            return

        try:
            _ensure_repo_root_on_syspath()
            # Import inside the try so missing optional deps don't crash app import.
            from wtf2.ml.flood_risk_model import FloodRiskModel  # type: ignore

            model = FloodRiskModel(model_type="random_forest")
            model.load_model(str(self._model_path))
            self._model = model
        except Exception as e:  # noqa: BLE001
            self._load_error = str(e)
            logger.exception("Failed to load wtf2 ML model: %s", e)
        finally:
            self._loaded = True

    def available(self) -> bool:
        self.load()
        return self._model is not None

    def predict(self, features: dict[str, Any]) -> MlPrediction:
        self.load()
        if self._model is None:
            raise RuntimeError(self._load_error or "ML model unavailable")

        raw = self._model.predict(features)
        return MlPrediction(
            risk_class=int(raw["risk_class"]),
            risk_label=str(raw["risk_label"]),
            probabilities={
                "low": float(raw["probabilities"]["low"]),
                "medium": float(raw["probabilities"]["medium"]),
                "high": float(raw["probabilities"]["high"]),
            },
            confidence=float(raw["confidence"]),
        )

    def feature_importance(self) -> Optional[list[tuple[str, float]]]:
        """Returns (feature_name, importance) sorted desc, if the loaded model supports it."""

        self.load()
        if self._model is None:
            return None

        model_obj = getattr(self._model, "model", None)
        names = getattr(self._model, "feature_names", None)
        importances = getattr(model_obj, "feature_importances_", None)
        if model_obj is None or not names or importances is None:
            return None

        pairs = list(zip(list(names), [float(x) for x in importances], strict=False))
        pairs.sort(key=lambda x: x[1], reverse=True)
        return pairs


# Singleton used by backend.
wtf2_model = Wtf2Model()


REGION_BASELINES: dict[str, dict[str, float]] = {
    # These are heuristics so the UI can drive the ML model with just region+scenario.
    # If you later wire real GIS-derived features, use /api/ml/predict instead.
    "Bihar": {
        "elevation": 120.0,
        "slope": 2.8,
        "flow_accumulation": 2600.0,
        "distance_to_river": 140.0,
        "lulc_agriculture": 0.72,
        "lulc_urban": 0.18,
        "population_density": 1100.0,
        "velocity_index": 0.55,
    },
    "Uttarakhand": {
        "elevation": 650.0,
        "slope": 18.0,
        "flow_accumulation": 1400.0,
        "distance_to_river": 220.0,
        "lulc_agriculture": 0.35,
        "lulc_urban": 0.10,
        "population_density": 260.0,
        "velocity_index": 0.75,
    },
    "Jharkhand": {
        "elevation": 180.0,
        "slope": 6.0,
        "flow_accumulation": 2100.0,
        "distance_to_river": 180.0,
        "lulc_agriculture": 0.55,
        "lulc_urban": 0.16,
        "population_density": 600.0,
        "velocity_index": 0.58,
    },
    "Uttar Pradesh": {
        "elevation": 110.0,
        "slope": 2.2,
        "flow_accumulation": 3000.0,
        "distance_to_river": 120.0,
        "lulc_agriculture": 0.65,
        "lulc_urban": 0.22,
        "population_density": 1200.0,
        "velocity_index": 0.62,
    },
}


def region_scenario_to_features(*, region: str, scenario: str) -> dict[str, Any]:
    base = REGION_BASELINES.get(region)
    if not base:
        raise KeyError(f"Unknown region baseline: {region}")

    depth = {"0m": 0.0, "1m": 1.0, "2m": 2.0}.get(scenario)
    if depth is None:
        raise KeyError(f"Unknown scenario: {scenario}")

    return {
        **base,
        "flood_depth": depth,
        "location_name": f"{region} ({scenario})",
        "district": None,
        "state": region,
    }


def risk_score_from_prediction(pred: MlPrediction) -> float:
    """Convert ML (Low/Medium/High + confidence) into the UI's 0-10 score."""

    base = {0: 2.4, 1: 5.8, 2: 8.2}.get(pred.risk_class, 5.0)
    # Center confidence ~0.34 (uniform 3-class) at 0, and scale moderately.
    score = base + (pred.confidence - (1.0 / 3.0)) * 2.0
    return float(max(0.0, min(10.0, score)))
