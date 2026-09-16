"""
WorkforceIQ - Sentiment Analysis Model
Uses DistilBERT / RoBERTa for employee feedback analysis
Detects: positive, negative, burnout signals, disengagement
"""

from typing import Optional
from functools import lru_cache
from loguru import logger
import numpy as np


SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"


class SentimentAnalyzer:
    """
    Multi-model sentiment analyzer for HR feedback.
    - DistilBERT: Binary sentiment (positive/negative)
    - DistilRoBERTa: Multi-label emotion detection
    """

    def __init__(self):
        self._sentiment_pipeline = None
        self._emotion_pipeline = None
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        try:
            from transformers import pipeline
            logger.info("🧠 Loading DistilBERT sentiment pipeline...")
            self._sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=SENTIMENT_MODEL,
                truncation=True,
                max_length=512,
            )
            logger.info("🧠 Loading emotion detection pipeline...")
            self._emotion_pipeline = pipeline(
                "text-classification",
                model=EMOTION_MODEL,
                truncation=True,
                max_length=512,
                top_k=None,
            )
            logger.info("✅ Sentiment models loaded")
        except Exception as e:
            logger.warning(f"⚠️  Could not load sentiment models: {e}. Using rule-based fallback.")
        finally:
            self._loaded = True

    def analyze(self, text: str) -> dict:
        """Analyze sentiment and emotions in text"""
        self._load()

        if self._sentiment_pipeline:
            return self._transformer_analyze(text)
        else:
            return self._rule_based_analyze(text)

    def _transformer_analyze(self, text: str) -> dict:
        """Full transformer-based analysis"""
        # Sentiment
        sentiment_result = self._sentiment_pipeline(text)[0]
        sentiment_label = sentiment_result["label"]  # POSITIVE / NEGATIVE
        sentiment_score = sentiment_result["score"]

        if sentiment_label == "NEGATIVE":
            sentiment_score = -sentiment_score
        
        # Emotions
        emotions = {}
        try:
            emotion_results = self._emotion_pipeline(text)[0]
            emotions = {r["label"]: round(r["score"], 3) for r in emotion_results}
        except Exception:
            emotions = {"neutral": 1.0}

        # Compute HR-specific signals
        burnout_signal = self._compute_burnout_signal(text, emotions)
        disengagement_signal = self._compute_disengagement(text, emotions, sentiment_score)

        return {
            "sentiment": sentiment_label.lower(),
            "sentiment_score": round(float(sentiment_score), 3),
            "emotions": emotions,
            "burnout_signal": round(burnout_signal, 3),
            "disengagement_signal": round(disengagement_signal, 3),
            "morale_score": round(self._compute_morale(sentiment_score, emotions), 3),
            "flags": self._extract_flags(text, emotions, burnout_signal),
        }

    def _rule_based_analyze(self, text: str) -> dict:
        """Keyword-based fallback when transformers not available"""
        text_lower = text.lower()
        
        # Sentiment keywords
        positive_words = {"great", "excellent", "love", "amazing", "fantastic", "wonderful",
                          "supportive", "growth", "opportunity", "collaborative", "valued"}
        negative_words = {"terrible", "awful", "burnout", "exhausted", "frustrated", "quit",
                          "leaving", "toxic", "unfair", "overworked", "stressed", "ignored"}
        burnout_words = {"burnout", "exhausted", "overwhelmed", "overworked", "no break",
                         "always on", "never off", "unsustainable", "excessive"}
        disengagement_words = {"don't care", "checked out", "going through motions", "meaningless",
                                "pointless", "no motivation", "disengaged", "indifferent"}

        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)
        burnout_count = sum(1 for w in burnout_words if w in text_lower)
        disengagement_count = sum(1 for w in disengagement_words if w in text_lower)

        total = pos_count + neg_count + 1
        raw_score = (pos_count - neg_count) / total

        sentiment = "positive" if raw_score > 0.1 else ("negative" if raw_score < -0.1 else "neutral")
        burnout_signal = min(1.0, burnout_count * 0.3)
        disengagement_signal = min(1.0, disengagement_count * 0.4)
        morale = max(0, min(1, (raw_score + 1) / 2))

        flags = []
        if burnout_signal > 0.3:
            flags.append("burnout_risk")
        if disengagement_signal > 0.3:
            flags.append("disengagement_risk")
        if sentiment == "negative":
            flags.append("negative_sentiment")
        if not flags:
            flags.append("healthy")

        return {
            "sentiment": sentiment,
            "sentiment_score": round(raw_score, 3),
            "emotions": {"joy": morale, "sadness": 1 - morale},
            "burnout_signal": burnout_signal,
            "disengagement_signal": disengagement_signal,
            "morale_score": morale,
            "flags": flags,
        }

    def _compute_burnout_signal(self, text: str, emotions: dict) -> float:
        """Compute burnout risk from emotions + keywords"""
        text_lower = text.lower()
        burnout_keywords = ["burnout", "exhausted", "overwhelmed", "overworked", "tired",
                             "no energy", "stressed", "pressure", "unsustainable"]
        keyword_score = sum(0.15 for kw in burnout_keywords if kw in text_lower)
        
        emotion_score = (
            emotions.get("anger", 0) * 0.3 +
            emotions.get("disgust", 0) * 0.2 +
            emotions.get("sadness", 0) * 0.2 +
            emotions.get("fear", 0) * 0.3
        )
        
        return min(1.0, keyword_score + emotion_score)

    def _compute_disengagement(self, text: str, emotions: dict, sentiment_score: float) -> float:
        """Compute disengagement likelihood"""
        text_lower = text.lower()
        disengage_keywords = ["don't care", "quit", "leaving", "job search", "other offers",
                               "meaningless", "pointless", "no purpose", "checking out"]
        keyword_score = sum(0.25 for kw in disengage_keywords if kw in text_lower)
        
        # Low joy + negative sentiment = disengagement risk
        emotion_score = max(0, -sentiment_score * 0.3)
        sadness_score = emotions.get("sadness", 0) * 0.2
        
        return min(1.0, keyword_score + emotion_score + sadness_score)

    def _compute_morale(self, sentiment_score: float, emotions: dict) -> float:
        """Compute overall morale 0-1"""
        base = (sentiment_score + 1) / 2  # normalize -1..1 → 0..1
        joy_boost = emotions.get("joy", 0) * 0.2
        anger_penalty = emotions.get("anger", 0) * 0.2
        return max(0, min(1, base + joy_boost - anger_penalty))

    def _extract_flags(self, text: str, emotions: dict, burnout_signal: float) -> list:
        """Extract HR alert flags"""
        flags = []
        if burnout_signal > 0.5:
            flags.append("burnout_risk")
        if emotions.get("anger", 0) > 0.4:
            flags.append("frustration_alert")
        if emotions.get("sadness", 0) > 0.5:
            flags.append("morale_decline")
        if any(kw in text.lower() for kw in ["quit", "leaving", "resign", "other job"]):
            flags.append("flight_risk")
        if emotions.get("joy", 0) > 0.6:
            flags.append("high_engagement")
        if not flags:
            flags.append("neutral")
        return flags

    def batch_analyze(self, texts: list[str]) -> list[dict]:
        """Analyze multiple feedback entries"""
        return [self.analyze(text) for text in texts]

    def department_morale(self, department_feedbacks: dict[str, list[str]]) -> dict:
        """
        Compute department-level morale scores.
        
        Args:
            department_feedbacks: {"Engineering": ["feedback1", ...], ...}
        
        Returns:
            Department morale summary
        """
        dept_scores = {}
        for dept, feedbacks in department_feedbacks.items():
            if not feedbacks:
                continue
            results = self.batch_analyze(feedbacks)
            avg_morale = np.mean([r["morale_score"] for r in results])
            avg_burnout = np.mean([r["burnout_signal"] for r in results])
            avg_sentiment = np.mean([r["sentiment_score"] for r in results])
            
            all_flags = [f for r in results for f in r["flags"]]
            flag_counts = {f: all_flags.count(f) for f in set(all_flags)}
            
            dept_scores[dept] = {
                "morale_score": round(float(avg_morale), 3),
                "burnout_signal": round(float(avg_burnout), 3),
                "avg_sentiment": round(float(avg_sentiment), 3),
                "top_flags": sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)[:3],
                "n_employees": len(feedbacks),
                "status": (
                    "Critical" if avg_morale < 0.3 else
                    "At Risk" if avg_morale < 0.5 else
                    "Moderate" if avg_morale < 0.7 else
                    "Healthy"
                ),
            }
        
        return dept_scores


@lru_cache(maxsize=1)
def get_sentiment_analyzer() -> SentimentAnalyzer:
    return SentimentAnalyzer()
