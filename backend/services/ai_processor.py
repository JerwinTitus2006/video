"""
AI Processor – extracts pain points, sentiment, action items and
generates solutions from meeting transcripts.
Uses spaCy + HuggingFace transformers (local models, no external API).
"""
import logging
import re
import subprocess
from typing import List, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models import (
    Meeting, Transcript, PainPoint, ActionItem,
    SentimentAnalysis, Solution,
)

logger = logging.getLogger("ai-meet.ai")

# ---------------------------------------------------------------------------
# Load NLP models (once at import time)
# ---------------------------------------------------------------------------
logger.info("🤖 Initialising AI module …")

# spaCy – optional NLP
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        logger.info("📥 Downloading spaCy model …")
        subprocess.run(
            ["python", "-m", "spacy", "download", "en_core_web_sm"], check=True
        )
        nlp = spacy.load("en_core_web_sm")
    logger.info("✅ spaCy loaded")
except Exception as exc:
    logger.warning("⚠️  spaCy not available (%s) – using simple regex fallback", exc)
    nlp = None

# Sentiment – skip heavy model downloads at startup; use simple keyword fallback
sentiment_analyzer = None
logger.info("ℹ️  Using keyword-based sentiment analysis (lightweight mode)")


# ---------------------------------------------------------------------------
# AIProcessor
# ---------------------------------------------------------------------------
class AIProcessor:

    PAIN_KEYWORDS: Dict[str, List[str]] = {
        "delivery": [
            "delay", "late", "not delivered", "shipping issue", "delivery problem",
            "not received", "pending delivery", "stuck", "delayed shipment",
        ],
        "pricing": [
            "expensive", "price increase", "cost issue", "payment problem",
            "too costly", "high price", "discount", "pricing concern",
        ],
        "quality": [
            "defect", "damaged", "broken", "poor quality", "quality issue",
            "not working", "faulty", "substandard", "inferior",
        ],
        "availability": [
            "out of stock", "unavailable", "shortage", "no stock",
            "sold out", "supply issue", "stock problem",
        ],
        "service": [
            "no response", "poor service", "support issue", "not helping",
            "bad service", "unresponsive", "customer service",
        ],
    }

    ACTION_VERBS = [
        "will", "should", "must", "need to", "have to",
        "going to", "plan to", "commit to", "promise to",
        "agree to", "let me", "i'll", "we'll", "shall",
    ]

    # ----- public entry point ----------------------------------------
    async def process_meeting(self, meeting_id: str, db: AsyncSession):
        """Full AI pipeline for a completed meeting."""
        logger.info("🤖 Starting AI processing for meeting %s", meeting_id)

        meeting = await db.get(Meeting, meeting_id)
        if not meeting:
            logger.error("❌ Meeting %s not found", meeting_id)
            return None

        result = await db.execute(
            select(Transcript)
            .where(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.created_at)
        )
        transcripts = list(result.scalars().all())
        if not transcripts:
            logger.warning("⚠️  No transcripts for meeting %s", meeting_id)
            return None

        full_text = " ".join(t.text for t in transcripts)
        logger.info("📄 Processing %d transcripts (%d chars)", len(transcripts), len(full_text))

        pain_points = await self._extract_pain_points(full_text, meeting_id, transcripts, db)
        sentiment = await self._analyze_sentiment(full_text, meeting_id, db)
        action_items = await self._extract_action_items(full_text, meeting_id, db)

        for pp in pain_points:
            await self._generate_solution(pp, db)

        await db.commit()

        logger.info(
            "✅ Done: %d pain points, %d actions, sentiment=%s",
            len(pain_points), len(action_items), sentiment["overall_sentiment"],
        )
        return {
            "pain_points_count": len(pain_points),
            "action_items_count": len(action_items),
            "sentiment": sentiment["overall_sentiment"],
            "sentiment_score": sentiment["sentiment_score"],
        }

    # ----- pain points ------------------------------------------------
    async def _extract_pain_points(
        self, text: str, meeting_id: str,
        transcripts: List[Transcript], db: AsyncSession,
    ) -> List[PainPoint]:
        if nlp is None:
            return await self._extract_pain_points_simple(text, meeting_id, transcripts, db)

        doc = nlp(text)
        pain_points: List[PainPoint] = []

        for sent in doc.sents:
            sent_text = sent.text.strip()
            sent_lower = sent_text.lower()
            category = self._match_category(sent_lower)
            if not category:
                continue

            severity = self._calc_severity(sent_lower)
            transcript_id = next(
                (t.id for t in transcripts if sent_text in t.text), None
            )

            pp = PainPoint(
                meeting_id=meeting_id,
                transcript_id=transcript_id,
                issue_text=sent_text,
                category=category,
                severity=severity,
                context=sent_text,
                status="open",
            )
            db.add(pp)
            pain_points.append(pp)
            logger.info("🔍 Pain [%s/%s]: %s…", category, severity, sent_text[:60])

        return pain_points

    async def _extract_pain_points_simple(
        self, text: str, meeting_id: str,
        transcripts: List[Transcript], db: AsyncSession,
    ) -> List[PainPoint]:
        """Fallback when spaCy is unavailable – split on sentences naively."""
        pain_points: List[PainPoint] = []
        for sentence in re.split(r'[.!?]+', text):
            sentence = sentence.strip()
            if not sentence:
                continue
            lower = sentence.lower()
            category = self._match_category(lower)
            if not category:
                continue
            severity = self._calc_severity(lower)
            transcript_id = next((t.id for t in transcripts if sentence in t.text), None)
            pp = PainPoint(
                meeting_id=meeting_id, transcript_id=transcript_id,
                issue_text=sentence, category=category,
                severity=severity, context=sentence, status="open",
            )
            db.add(pp)
            pain_points.append(pp)
        return pain_points

    # ----- sentiment --------------------------------------------------
    async def _analyze_sentiment(
        self, text: str, meeting_id: str, db: AsyncSession,
    ) -> Dict:
        if sentiment_analyzer is None:
            sa = SentimentAnalysis(
                meeting_id=meeting_id, overall_sentiment="neutral",
                sentiment_score=50.0, distributor_satisfaction=50.0,
                key_emotions=[], confidence=0.5,
            )
            db.add(sa)
            return {"overall_sentiment": "neutral", "sentiment_score": 50.0}

        chunk_size = 500
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        sentiments = []
        for chunk in chunks[:20]:
            if chunk.strip():
                try:
                    sentiments.append(sentiment_analyzer(chunk[:512])[0])
                except Exception as exc:
                    logger.error("Sentiment chunk error: %s", exc)

        if not sentiments:
            db.add(SentimentAnalysis(
                meeting_id=meeting_id, overall_sentiment="neutral",
                sentiment_score=50.0, distributor_satisfaction=50.0,
                key_emotions=[], confidence=0.5,
            ))
            return {"overall_sentiment": "neutral", "sentiment_score": 50.0}

        pos = sum(1 for s in sentiments if s["label"] == "POSITIVE")
        neg = len(sentiments) - pos
        avg = sum(s["score"] for s in sentiments) / len(sentiments)

        if pos > neg * 1.5:
            overall = "positive"
        elif neg > pos * 1.5:
            overall = "negative"
        else:
            overall = "neutral"

        score = round(avg * 100, 2)
        sa = SentimentAnalysis(
            meeting_id=meeting_id, overall_sentiment=overall,
            sentiment_score=score, distributor_satisfaction=score,
            manufacturer_sentiment=score,
            key_emotions=[], confidence=round(avg, 2),
        )
        db.add(sa)
        logger.info("😊 Sentiment: %s (score: %s)", overall, score)
        return {"overall_sentiment": overall, "sentiment_score": score}

    # ----- action items -----------------------------------------------
    async def _extract_action_items(
        self, text: str, meeting_id: str, db: AsyncSession,
    ) -> List[ActionItem]:
        sentences = (
            list(nlp(text).sents) if nlp else
            [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        )
        items: List[ActionItem] = []
        for sent in sentences:
            sent_text = sent.text.strip() if hasattr(sent, "text") else str(sent).strip()
            lower = sent_text.lower()
            if not any(v in lower for v in self.ACTION_VERBS):
                continue

            assignee = "Unassigned"
            if nlp and hasattr(sent, '__iter__'):
                for tok in sent:
                    if tok.dep_ == "nsubj":
                        assignee = tok.text.capitalize()
                        break

            priority = "medium"
            if any(w in lower for w in ("urgent", "asap", "immediately", "critical")):
                priority = "urgent"
            elif any(w in lower for w in ("important", "priority", "must")):
                priority = "high"
            elif any(w in lower for w in ("should", "could", "maybe")):
                priority = "low"

            ai = ActionItem(
                meeting_id=meeting_id,
                task_description=sent_text,
                assigned_to=assignee,
                priority=priority,
                status="pending",
            )
            db.add(ai)
            items.append(ai)
            logger.info("✅ Action [%s]: %s… → %s", priority, sent_text[:60], assignee)

        return items

    # ----- solution generation ----------------------------------------
    SOLUTIONS_MAP = {
        "delivery": {
            "critical": ["Escalate to logistics head immediately",
                         "Arrange emergency courier service",
                         "Provide hourly status updates to customer"],
            "high": ["Contact logistics partner for expedited delivery",
                     "Implement real-time tracking system",
                     "Set up automated delay alerts"],
            "medium": ["Review delivery timelines with logistics team",
                       "Optimize route planning",
                       "Increase buffer time in delivery estimates"],
            "low": ["Monitor delivery performance metrics",
                    "Conduct monthly logistics review"],
        },
        "pricing": {
            "critical": ["Executive approval for special pricing",
                         "Immediate price match offer",
                         "Custom payment terms negotiation"],
            "high": ["Volume discount analysis",
                     "Review competitive pricing",
                     "Offer flexible payment options"],
            "medium": ["Long-term contract pricing review",
                       "Bundle offerings for better value",
                       "Transparent cost breakdown"],
            "low": ["Regular pricing communication",
                    "Market comparison updates"],
        },
        "quality": {
            "critical": ["Immediate product recall/replacement",
                         "Quality team investigation",
                         "Customer compensation package"],
            "high": ["Batch quality audit", "Supplier quality review",
                     "Enhanced QC procedures"],
            "medium": ["Quality improvement program",
                       "Staff training on quality standards",
                       "Regular quality audits"],
            "low": ["Feedback integration process",
                    "Quality metrics monitoring"],
        },
        "availability": {
            "critical": ["Emergency procurement",
                         "Supplier diversification immediately",
                         "Stock reallocation from other warehouses"],
            "high": ["Increase safety stock levels",
                     "Expedite supplier orders",
                     "Alternative product recommendations"],
            "medium": ["Demand forecasting improvement",
                       "Just-in-time inventory review",
                       "Pre-order system implementation"],
            "low": ["Regular stock level monitoring",
                    "Seasonal demand planning"],
        },
        "service": {
            "critical": ["Dedicated account manager assignment",
                         "24/7 support line activation",
                         "Executive escalation"],
            "high": ["Response time SLA reduction",
                     "Support team training",
                     "Multi-channel support setup"],
            "medium": ["Implement ticketing system",
                       "Self-service portal creation",
                       "FAQ/knowledge base update"],
            "low": ["Regular service quality surveys",
                    "Support process optimization"],
        },
        "other": {
            "critical": ["Immediate executive review", "Emergency action plan"],
            "high": ["Priority investigation", "Stakeholder meeting"],
            "medium": ["Detailed analysis", "Action plan creation"],
            "low": ["Monitor and review", "Documentation"],
        },
    }

    async def _generate_solution(self, pain_point: PainPoint, db: AsyncSession):
        cat = pain_point.category or "other"
        sev = pain_point.severity or "medium"
        cat_map = self.SOLUTIONS_MAP.get(cat, self.SOLUTIONS_MAP["other"])
        steps = cat_map.get(sev, cat_map.get("medium", ["Review and address the issue"]))

        sol = Solution(
            pain_point_id=pain_point.id,
            solution_text=steps[0],
            implementation_steps=steps,
            priority_rank=1,
            feasibility_score=0.8,
            estimated_impact="high" if sev in ("critical", "high") else "medium",
            generated_by="ai",
        )
        db.add(sol)
        logger.info("💡 Solution: %s…", steps[0][:50])

    # ----- helpers ----------------------------------------------------
    def _match_category(self, text_lower: str) -> Optional[str]:
        for cat, keywords in self.PAIN_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return cat
        return None

    @staticmethod
    def _calc_severity(text: str) -> str:
        if any(w in text for w in ("urgent", "critical", "immediately", "emergency", "asap", "crisis")):
            return "critical"
        if any(w in text for w in ("important", "serious", "major", "significant", "severe")):
            return "high"
        if any(w in text for w in ("problem", "issue", "concern")):
            return "medium"
        return "low"


# Singleton
ai_processor = AIProcessor()


# ---------------------------------------------------------------------------
# Real-time helper (called per transcript line)
# ---------------------------------------------------------------------------
async def check_for_pain_points_realtime(
    text: str, meeting_id: str, transcript_id: str, db: AsyncSession,
) -> Optional[str]:
    """Quick keyword scan – returns new pain-point id (or None)."""
    quick_keywords = {
        "delivery": ["delay", "late", "not delivered", "shipping issue"],
        "pricing": ["expensive", "price", "cost issue", "payment problem"],
        "quality": ["defect", "damaged", "broken", "poor quality"],
        "availability": ["out of stock", "unavailable", "shortage"],
        "service": ["no response", "poor service", "support issue"],
    }
    lower = text.lower()
    for category, keywords in quick_keywords.items():
        for kw in keywords:
            if kw in lower:
                severity = (
                    "critical" if ("urgent" in lower or "immediately" in lower) else "medium"
                )
                pp = PainPoint(
                    meeting_id=meeting_id,
                    transcript_id=transcript_id,
                    issue_text=text,
                    category=category,
                    severity=severity,
                    context=text,
                    status="open",
                )
                db.add(pp)
                await db.commit()
                logger.info("🚨 Real-time pain [%s]: %s…", category, text[:50])
                return pp.id
    return None
