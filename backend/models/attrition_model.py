"""
WorkforceIQ - Attrition Prediction Model
XGBoost + LightGBM ensemble with SHAP explainability
"""

import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from typing import Optional
from loguru import logger

# Lazy imports for heavy ML libs
def _import_ml():
    from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.ensemble import RandomForestClassifier, VotingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import classification_report, roc_auc_score, f1_score
    from sklearn.pipeline import Pipeline
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
    import shap
    return {
        "train_test_split": train_test_split,
        "StratifiedKFold": StratifiedKFold,
        "cross_val_score": cross_val_score,
        "LabelEncoder": LabelEncoder,
        "StandardScaler": StandardScaler,
        "RandomForestClassifier": RandomForestClassifier,
        "VotingClassifier": VotingClassifier,
        "LogisticRegression": LogisticRegression,
        "classification_report": classification_report,
        "roc_auc_score": roc_auc_score,
        "f1_score": f1_score,
        "Pipeline": Pipeline,
        "XGBClassifier": XGBClassifier,
        "LGBMClassifier": LGBMClassifier,
        "shap": shap,
    }


# Default (shared) model paths — used for the CLI/offline training script,
# and as a fallback baseline until a company retrains its own model.
MODEL_PATH = Path("models/attrition_model.pkl")
ENCODER_PATH = Path("models/label_encoders.pkl")
SCALER_PATH = Path("models/scaler.pkl")
FEATURE_COLS_PATH = Path("models/feature_cols.pkl")


def _company_dir(company_id: Optional[int]) -> Path:
    return Path(f"models/companies/{company_id}") if company_id is not None else Path("models")


def model_paths(company_id: Optional[int] = None) -> dict:
    """Per-company model artifact paths. Falls back to the shared default
    paths when no per-company model has been trained yet."""
    company_dir = _company_dir(company_id)
    company_model = company_dir / "attrition_model.pkl"
    if company_id is not None and company_model.exists():
        return {
            "model": company_model,
            "encoders": company_dir / "label_encoders.pkl",
            "feature_cols": company_dir / "feature_cols.pkl",
            "explainer": company_dir / "explainer.pkl",
        }
    return {
        "model": MODEL_PATH,
        "encoders": ENCODER_PATH,
        "feature_cols": FEATURE_COLS_PATH,
        "explainer": Path("models/explainer.pkl"),
    }

CATEGORICAL_COLS = [
    "Department", "JobRole", "EducationField", "Gender",
    "MaritalStatus", "BusinessTravel", "OverTime", "TenureBand"
]

NUMERIC_COLS = [
    "Age", "MonthlyIncome", "HourlyRate", "DistanceFromHome",
    "NumCompaniesWorked", "TotalWorkingYears", "YearsAtCompany",
    "YearsInCurrentRole", "YearsSinceLastPromotion", "YearsWithCurrManager",
    "EnvironmentSatisfaction", "JobSatisfaction", "RelationshipSatisfaction",
    "WorkLifeBalance", "JobInvolvement", "PerformanceRating",
    "StockOptionLevel", "TrainingTimesLastYear", "PercentSalaryHike",
    "Education",
]

ALL_FEATURES = CATEGORICAL_COLS + NUMERIC_COLS


def preprocess(df: pd.DataFrame, encoders: Optional[dict] = None, fit: bool = True):
    """Preprocess HR dataframe for ML"""
    ml = _import_ml()
    LabelEncoder = ml["LabelEncoder"]
    
    df = df.copy()
    
    # Fill missing
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
        else:
            df[col] = "Unknown"
    
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(df[col].median() if col in df.columns else 0)
        else:
            df[col] = 0
    
    if "TenureBand" not in df.columns:
        df["TenureBand"] = pd.cut(
            df.get("YearsAtCompany", pd.Series([0] * len(df))),
            bins=[-1, 1, 3, 7, 15, 100],
            labels=["<1yr", "1-3yr", "3-7yr", "7-15yr", "15+yr"]
        ).astype(str)
    
    if encoders is None:
        encoders = {}
    
    for col in CATEGORICAL_COLS:
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
        else:
            le = encoders.get(col)
            if le:
                # Handle unseen labels
                classes = set(le.classes_)
                df[col] = df[col].apply(lambda x: x if x in classes else le.classes_[0])
                df[col] = le.transform(df[col].astype(str))
    
    return df[ALL_FEATURES], encoders


def train_model(data_path: str = "datasets/hr_employee_data.csv", company_id: Optional[int] = None):
    """Train the attrition prediction ensemble model.

    When company_id is given, the trained artifacts are saved under
    models/companies/{company_id}/ instead of the shared default path —
    each company's model is trained only on its own data and never
    overwrites another company's model."""
    ml = _import_ml()
    
    logger.info("📊 Loading training data...")
    df = pd.read_csv(data_path)
    
    # Encode target
    y = (df["Attrition"] == "Yes").astype(int)
    X, encoders = preprocess(df, fit=True)
    
    X_train, X_test, y_train, y_test = ml["train_test_split"](
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info(f"📐 Training set: {len(X_train)} | Test set: {len(X_test)}")
    logger.info(f"📐 Class balance - Attrition: {y_train.mean():.1%}")
    
    # ---- XGBoost ----
    xgb = ml["XGBClassifier"](
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    
    # ---- LightGBM ----
    lgbm = ml["LGBMClassifier"](
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )
    
    # ---- Random Forest ----
    rf = ml["RandomForestClassifier"](
        n_estimators=100,
        max_depth=8,
        class_weight="balanced",
        random_state=42,
    )
    
    # ---- Voting Ensemble ----
    ensemble = ml["VotingClassifier"](
        estimators=[("xgb", xgb), ("lgbm", lgbm), ("rf", rf)],
        voting="soft",
        weights=[2, 2, 1],
    )
    
    logger.info("🏋️ Training ensemble model (XGBoost + LightGBM + RandomForest)...")
    ensemble.fit(X_train, y_train)
    
    # Evaluate
    y_pred_proba = ensemble.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)
    auc = ml["roc_auc_score"](y_test, y_pred_proba)
    f1 = ml["f1_score"](y_test, y_pred)
    
    logger.info(f"✅ Model Evaluation:")
    logger.info(f"   ROC-AUC: {auc:.4f}")
    logger.info(f"   F1-Score: {f1:.4f}")
    logger.info(f"\n{ml['classification_report'](y_test, y_pred)}")
    
    # Compute SHAP values on XGBoost for explainability
    logger.info("📊 Computing SHAP feature importance...")
    shap = ml["shap"]
    fitted_xgb = ensemble.estimators_[0]  # XGBoost is first in the voting ensemble
    explainer = shap.TreeExplainer(fitted_xgb)
    shap_values = explainer.shap_values(X_test)
    mean_shap = pd.Series(
        np.abs(shap_values).mean(axis=0),
        index=ALL_FEATURES
    ).sort_values(ascending=False)

    logger.info("Top 10 Feature Importances (SHAP):")
    for feat, val in mean_shap.head(10).items():
        logger.info(f"  {feat}: {val:.4f}")

    # Save artifacts
    company_dir = _company_dir(company_id)
    company_dir.mkdir(parents=True, exist_ok=True)
    paths = model_paths(company_id) if company_id is None else {
        "model": company_dir / "attrition_model.pkl",
        "encoders": company_dir / "label_encoders.pkl",
        "feature_cols": company_dir / "feature_cols.pkl",
        "explainer": company_dir / "explainer.pkl",
    }
    joblib.dump(ensemble, paths["model"])
    joblib.dump(encoders, paths["encoders"])
    joblib.dump(ALL_FEATURES, paths["feature_cols"])
    joblib.dump({"xgb": fitted_xgb, "shap_explainer": explainer, "mean_shap": mean_shap.to_dict()}, paths["explainer"])

    logger.info(f"💾 Model saved to {paths['model']}")
    return {"auc": auc, "f1": f1}


def load_model(company_id: Optional[int] = None):
    """Load trained model artifacts for a given company (or the shared
    default model if that company hasn't trained its own yet)."""
    paths = model_paths(company_id)
    if not paths["model"].exists():
        raise FileNotFoundError(
            f"Model not found at {paths['model']}. Run: python backend/models/attrition_model.py"
        )
    return (
        joblib.load(paths["model"]),
        joblib.load(paths["encoders"]),
        joblib.load(paths["feature_cols"]),
    )


def predict_attrition(employee_data: dict, company_id: Optional[int] = None) -> dict:
    """
    Predict attrition risk for a single employee.
    
    Returns:
        {
            "attrition_risk": "High" | "Medium" | "Low",
            "probability": 0.0-1.0,
            "confidence": 0.0-1.0,
            "risk_factors": [...],
            "shap_values": {...},
            "explanation": "..."
        }
    """
    model, encoders, feature_cols = load_model(company_id=company_id)

    df = pd.DataFrame([employee_data])
    X, _ = preprocess(df, encoders=encoders, fit=False)
    
    proba = model.predict_proba(X)[0][1]
    
    # Load SHAP explainer
    try:
        explainer_data = joblib.load(model_paths(company_id)["explainer"])
        xgb_model = explainer_data["xgb"]
        explainer = explainer_data["shap_explainer"]
        shap_values = explainer.shap_values(X)[0]
        shap_dict = dict(zip(ALL_FEATURES, shap_values))
        top_factors = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
    except Exception:
        shap_dict = {}
        top_factors = []
    
    # Risk categorization
    if proba >= 0.7:
        risk = "High"
        confidence = min(0.95, proba + 0.1)
    elif proba >= 0.4:
        risk = "Medium"
        confidence = 0.7 + abs(proba - 0.55) * 0.5
    else:
        risk = "Low"
        confidence = min(0.95, 1 - proba + 0.1)
    
    # Human-readable risk factors
    risk_factors = []
    emp = employee_data
    if emp.get("OverTime") == "Yes":
        risk_factors.append("Consistent overtime work detected")
    if emp.get("JobSatisfaction", 4) <= 2:
        risk_factors.append("Low job satisfaction score")
    if emp.get("WorkLifeBalance", 4) <= 2:
        risk_factors.append("Poor work-life balance")
    if emp.get("YearsSinceLastPromotion", 0) >= 4:
        risk_factors.append("No promotion in 4+ years")
    if emp.get("MonthlyIncome", 10000) < 5000:
        risk_factors.append("Compensation below market average")
    if emp.get("EnvironmentSatisfaction", 4) <= 2:
        risk_factors.append("Low environment satisfaction")
    
    from utils.llm import explain_attrition_prediction
    explanation = explain_attrition_prediction(
        {**employee_data, "risk_probability": proba},
        {k: v for k, v in top_factors}
    )
    
    return {
        "attrition_risk": risk,
        "probability": round(float(proba), 3),
        "confidence": round(float(confidence), 3),
        "risk_factors": risk_factors,
        "shap_values": {k: round(float(v), 4) for k, v in top_factors},
        "explanation": explanation,
    }


def batch_predict(employees: list[dict]) -> list[dict]:
    """Batch attrition prediction for multiple employees"""
    results = []
    model, encoders, feature_cols = load_model()
    
    df = pd.DataFrame(employees)
    X, _ = preprocess(df, encoders=encoders, fit=False)
    probas = model.predict_proba(X)[:, 1]
    
    for i, (emp, proba) in enumerate(zip(employees, probas)):
        results.append({
            "employee_id": emp.get("EmployeeID", f"EMP_{i}"),
            "department": emp.get("Department", "Unknown"),
            "probability": round(float(proba), 3),
            "risk": "High" if proba >= 0.7 else ("Medium" if proba >= 0.4 else "Low"),
        })
    
    return sorted(results, key=lambda x: x["probability"], reverse=True)


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    metrics = train_model()
    print(f"\n🎉 Training complete! AUC: {metrics['auc']:.4f}, F1: {metrics['f1']:.4f}")
