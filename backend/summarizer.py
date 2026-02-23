import logging
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM, 
    pipeline,
    BartForConditionalGeneration,
    T5ForConditionalGeneration
)
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter
import numpy as np
from utils import ConfigManager, TextProcessor

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

logger = logging.getLogger(__name__)


class MeetingSummarizer:
    """Advanced meeting summarization using transformer models"""
    
    def __init__(self, model_name: str = "facebook/bart-large-cnn"):
        """
        Initialize summarization engine
        
        Args:
            model_name: HuggingFace model name for summarization
        """
        self.model_name = model_name
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_dir = ConfigManager.get_model_cache_dir()
        
        self.tokenizer = None
        self.model = None
        self.summarizer = None
        
        logger.info(f"Meeting summarizer initialized with {model_name} on {self.device}")
    
    def load_model(self) -> bool:
        """Load summarization model and tokenizer"""
        try:
            logger.info(f"Loading summarization model: {self.model_name}")
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=str(self.model_dir)
            )
            
            if "t5" in self.model_name.lower():
                self.model = T5ForConditionalGeneration.from_pretrained(
                    self.model_name,
                    cache_dir=str(self.model_dir)
                )
            elif "bart" in self.model_name.lower():
                self.model = BartForConditionalGeneration.from_pretrained(
                    self.model_name,
                    cache_dir=str(self.model_dir)
                )
            else:
                self.model = AutoModelForSeq2SeqLM.from_pretrained(
                    self.model_name,
                    cache_dir=str(self.model_dir)
                )
            
            self.model.to(self.device)
            
            # Create pipeline
            self.summarizer = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if torch.cuda.is_available() else -1
            )
            
            logger.info("Summarization model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load summarization model: {e}")
            return False
    
    def summarize_meeting(self, 
                         transcript: str,
                         speaker_segments: Optional[List[Dict]] = None,
                         summary_type: str = "comprehensive") -> Dict:
        """
        Generate comprehensive meeting summary
        
        Args:
            transcript: Full meeting transcript
            speaker_segments: Speaker-labeled transcript segments
            summary_type: Type of summary ('brief', 'comprehensive', 'detailed')
            
        Returns:
            Dictionary with various summary types
        """
        try:
            logger.info(f"Generating {summary_type} meeting summary...")
            
            if not transcript.strip():
                return {"error": "Empty transcript provided"}
            
            # Clean and preprocess transcript
            cleaned_transcript = self._preprocess_transcript(transcript)
            
            # Generate different types of summaries
            summaries = {}
            
            # Main summary
            summaries["main_summary"] = self._generate_main_summary(
                cleaned_transcript, 
                summary_type
            )
            
            # Extract key points
            summaries["key_points"] = self._extract_key_points(
                cleaned_transcript,
                speaker_segments
            )
            
            # Extract action items
            summaries["action_items"] = self._extract_action_items(
                cleaned_transcript,
                speaker_segments
            )
            
            # Extract decisions made
            summaries["decisions"] = self._extract_decisions(
                cleaned_transcript,
                speaker_segments
            )
            
            # Generate participant summary
            if speaker_segments:
                summaries["participant_summary"] = self._generate_participant_summary(
                    speaker_segments
                )
            
            # Extract topics discussed
            summaries["topics"] = self._extract_topics(cleaned_transcript)
            
            # Generate meeting metadata
            summaries["metadata"] = self._generate_metadata(
                transcript,
                speaker_segments
            )
            
            logger.info("Meeting summary generated successfully")
            
            return {
                "status": "success",
                **summaries
            }
            
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def _preprocess_transcript(self, transcript: str) -> str:
        """Clean and preprocess transcript for summarization"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', transcript)
        
        # Remove filler words and hesitations
        filler_words = [
            r'\b(um|uh|er|ah|like|you know|sort of|kind of)\b',
            r'\b(so|well|actually|basically|literally)\b',
            r'\[.*?\]',  # Remove speaker labels in brackets
            r'\(.*?\)',  # Remove parenthetical content
        ]
        
        for pattern in filler_words:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Clean up punctuation
        text = re.sub(r'[.,;:!?]+', '.', text)
        text = re.sub(r'\.+', '.', text)
        
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _generate_main_summary(self, transcript: str, summary_type: str) -> str:
        """Generate main meeting summary"""
        if not self.summarizer:
            return "Summarization model not loaded"
        
        try:
            # Determine summary length based on type
            length_settings = {
                "brief": {"min_length": 50, "max_length": 150},
                "comprehensive": {"min_length": 150, "max_length": 300},
                "detailed": {"min_length": 300, "max_length": 500}
            }
            
            settings = length_settings.get(summary_type, length_settings["comprehensive"])
            
            # Split transcript into chunks if too long
            max_input_length = 1024
            if len(transcript.split()) > max_input_length:
                chunks = self._split_text_into_chunks(transcript, max_input_length)
                summaries = []
                
                for chunk in chunks:
                    result = self.summarizer(
                        chunk,
                        min_length=settings["min_length"] // len(chunks),
                        max_length=settings["max_length"] // len(chunks),
                        do_sample=False
                    )
                    summaries.append(result[0]['summary_text'])
                
                # Combine chunk summaries
                combined_summary = " ".join(summaries)
                
                # Final summarization pass
                if len(combined_summary.split()) > settings["max_length"]:
                    final_result = self.summarizer(
                        combined_summary,
                        min_length=settings["min_length"],
                        max_length=settings["max_length"],
                        do_sample=False
                    )
                    return final_result[0]['summary_text']
                else:
                    return combined_summary
            else:
                # Single summarization
                result = self.summarizer(
                    transcript,
                    min_length=settings["min_length"],
                    max_length=settings["max_length"],
                    do_sample=False
                )
                return result[0]['summary_text']
                
        except Exception as e:
            logger.error(f"Main summary generation error: {e}")
            return f"Error generating summary: {str(e)}"
    
    def _split_text_into_chunks(self, text: str, max_words: int) -> List[str]:
        """Split text into chunks of maximum word count"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i:i + max_words])
            chunks.append(chunk)
        
        return chunks
    
    def _extract_key_points(self, transcript: str, speaker_segments: Optional[List[Dict]]) -> List[str]:
        """Extract key points from meeting"""
        key_points = []
        
        # Keywords that often indicate important points
        importance_indicators = [
            r'\b(important|crucial|critical|key|main|primary|significant)\b',
            r'\b(decision|conclude|agree|resolve|determine)\b',
            r'\b(problem|issue|challenge|concern|risk)\b',
            r'\b(solution|approach|strategy|plan|proposal)\b',
            r'\b(goal|objective|target|milestone|deadline)\b'
        ]
        
        sentences = sent_tokenize(transcript)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 20:  # Skip very short sentences
                continue
            
            # Check for importance indicators
            score = 0
            for pattern in importance_indicators:
                if re.search(pattern, sentence, re.IGNORECASE):
                    score += 1
            
            # Check sentence length (medium length sentences often contain key info)
            word_count = len(sentence.split())
            if 10 <= word_count <= 40:
                score += 1
            
            # Check for question format (decisions often follow questions)
            if sentence.endswith('?'):
                score += 1
            
            if score >= 2:
                key_points.append(sentence)
        
        # Limit to top 10 key points
        return key_points[:10]
    
    def _extract_action_items(self, transcript: str, speaker_segments: Optional[List[Dict]]) -> List[Dict]:
        """Extract action items with assignees if possible"""
        action_items = []
        
        action_patterns = [
            r'\b(will|shall|should|need to|must|has to|going to)\s+(\w+(?:\s+\w+)*)',
            r'\b(action item|todo|to do|follow up|next step)\b[:\-]?\s*(.*?)(?:\.|$)',
            r'\b(assign|responsible|owner|due|deadline|by)\s+(.*?)(?:\.|$)',
            r'\b(\w+)\s+will\s+(.*?)(?:\.|$)',
            r'\b(complete|finish|deliver|provide|send|prepare)\s+(.*?)(?:\.|$)'
        ]
        
        sentences = sent_tokenize(transcript)
        
        for sentence in sentences:
            sentence = sentence.strip()
            
            for pattern in action_patterns:
                matches = re.finditer(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    action_text = match.group(0)
                    
                    # Try to extract assignee and task
                    assignee = "Unassigned"
                    task = action_text
                    
                    # Simple assignee detection
                    name_patterns = [
                        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+will\b',
                        r'\bassign(?:ed)?\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
                        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|will be)\s+responsible\b'
                    ]
                    
                    for name_pattern in name_patterns:
                        name_match = re.search(name_pattern, sentence, re.IGNORECASE)
                        if name_match:
                            assignee = name_match.group(1)
                            break
                    
                    # Extract deadline if mentioned
                    deadline = None
                    deadline_patterns = [
                        r'\bby\s+([A-Za-z]+\s+\d+)',
                        r'\bdue\s+([A-Za-z]+\s+\d+)',
                        r'\bdeadline\s+([A-Za-z]+\s+\d+)',
                        r'\bnext\s+(week|month|friday|monday|tuesday|wednesday|thursday)'
                    ]
                    
                    for deadline_pattern in deadline_patterns:
                        deadline_match = re.search(deadline_pattern, sentence, re.IGNORECASE)
                        if deadline_match:
                            deadline = deadline_match.group(1)
                            break
                    
                    action_items.append({
                        "task": task.strip(),
                        "assignee": assignee,
                        "deadline": deadline,
                        "context": sentence,
                        "confidence": "medium"
                    })
        
        # Remove duplicates and limit
        unique_actions = []
        seen_tasks = set()
        
        for action in action_items:
            task_key = action["task"].lower()
            if task_key not in seen_tasks and len(task_key) > 10:
                seen_tasks.add(task_key)
                unique_actions.append(action)
        
        return unique_actions[:8]
    
    def _extract_decisions(self, transcript: str, speaker_segments: Optional[List[Dict]]) -> List[str]:
        """Extract decisions made in the meeting"""
        decisions = []
        
        decision_patterns = [
            r'\b(decided|concluded|agreed|determined|resolved)\s+(.*?)(?:\.|$)',
            r'\b(decision|conclusion|agreement|resolution)\s*(.*?)(?:\.|$)',
            r'\bwe\s+(will|shall|are going to|have decided to)\s+(.*?)(?:\.|$)',
            r'\bit\s+(?:was|is)\s+(?:decided|agreed|concluded)\s+(.*?)(?:\.|$)'
        ]
        
        sentences = sent_tokenize(transcript)
        
        for sentence in sentences:
            sentence = sentence.strip()
            
            for pattern in decision_patterns:
                matches = re.finditer(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    decision_text = match.group(0)
                    if len(decision_text) > 15:  # Filter very short matches
                        decisions.append(decision_text.strip())
        
        # Remove duplicates and limit
        unique_decisions = list(set(decisions))[:6]
        return unique_decisions
    
    def _generate_participant_summary(self, speaker_segments: List[Dict]) -> Dict[str, Dict]:
        """Generate summary for each participant"""
        participant_data = {}
        
        for segment in speaker_segments:
            speaker = segment.get("speaker", "Unknown")
            text = segment.get("text", "")
            duration = segment.get("duration", 0)
            
            if speaker not in participant_data:
                participant_data[speaker] = {
                    "total_speaking_time": 0,
                    "segments": [],
                    "word_count": 0,
                    "key_contributions": []
                }
            
            participant_data[speaker]["total_speaking_time"] += duration
            participant_data[speaker]["segments"].append(text)
            participant_data[speaker]["word_count"] += len(text.split())
        
        # Generate summaries for each participant
        for speaker, data in participant_data.items():
            combined_text = " ".join(data["segments"])
            
            # Extract key contributions
            key_contributions = self._extract_participant_contributions(combined_text)
            data["key_contributions"] = key_contributions
            
            # Calculate participation percentage
            total_meeting_time = sum(seg.get("duration", 0) for seg in speaker_segments)
            participation_percent = (data["total_speaking_time"] / total_meeting_time * 100) if total_meeting_time > 0 else 0
            data["participation_percentage"] = round(participation_percent, 1)
        
        return participant_data
    
    def _extract_participant_contributions(self, text: str) -> List[str]:
        """Extract key contributions from participant's speech"""
        sentences = sent_tokenize(text)
        
        # Look for sentences with important content
        important_sentences = []
        
        importance_words = [
            "suggest", "propose", "recommend", "think", "believe",
            "important", "critical", "key", "main", "primary",
            "solution", "approach", "idea", "plan", "strategy"
        ]
        
        for sentence in sentences:
            if len(sentence.split()) > 8:  # Reasonable length
                score = sum(1 for word in importance_words if word in sentence.lower())
                if score >= 1:
                    important_sentences.append(sentence.strip())
        
        return important_sentences[:3]  # Top 3 contributions
    
    def _extract_topics(self, transcript: str) -> List[Dict[str, any]]:
        """Extract main topics discussed"""
        # Simple topic extraction using keyword frequency
        try:
            stop_words = set(stopwords.words('english'))
        except:
            stop_words = set()
        
        # Additional meeting-specific stop words
        meeting_stop_words = {
            'meeting', 'call', 'discussion', 'talk', 'say', 'said',
            'think', 'know', 'like', 'well', 'okay', 'right', 'yes', 'no'
        }
        stop_words.update(meeting_stop_words)
        
        # Tokenize and filter
        words = word_tokenize(transcript.lower())
        filtered_words = [
            word for word in words 
            if word.isalpha() and len(word) > 3 and word not in stop_words
        ]
        
        # Get word frequencies
        word_freq = Counter(filtered_words)
        
        # Extract topics as most frequent meaningful words
        topics = []
        for word, freq in word_freq.most_common(10):
            topics.append({
                "topic": word.capitalize(),
                "frequency": freq,
                "relevance_score": round(freq / len(filtered_words), 3)
            })
        
        return topics
    
    def _generate_metadata(self, transcript: str, speaker_segments: Optional[List[Dict]]) -> Dict:
        """Generate meeting metadata"""
        metadata = {}
        
        # Basic metrics
        word_count = len(transcript.split())
        char_count = len(transcript)
        
        metadata.update({
            "word_count": word_count,
            "character_count": char_count,
            "estimated_reading_time_minutes": round(word_count / 250, 1),  # Average reading speed
        })
        
        if speaker_segments:
            speakers = set(seg.get("speaker") for seg in speaker_segments)
            total_duration = sum(seg.get("duration", 0) for seg in speaker_segments)
            
            metadata.update({
                "num_speakers": len(speakers),
                "total_speaking_time_minutes": round(total_duration / 60, 1),
                "speakers": list(speakers)
            })
        
        return metadata


# Global summarizer instance
meeting_summarizer = MeetingSummarizer()


async def initialize_summarizer(model_name: str = "facebook/bart-large-cnn") -> bool:
    """Initialize the global meeting summarizer"""
    global meeting_summarizer
    
    logger.info(f"Initializing meeting summarizer with {model_name}...")
    
    # Update model if different
    if meeting_summarizer.model_name != model_name:
        meeting_summarizer = MeetingSummarizer(model_name)
    
    # Load model
    success = meeting_summarizer.load_model()
    
    if success:
        logger.info("Meeting summarizer ready")
    else:
        logger.error("Failed to initialize meeting summarizer")
    
    return success