
import pytest
from app.services.voice_agent_service import VoiceAgentService, ConversationStep, ConversationState

class TestVoiceAgentFlow:
    def test_determine_next_step_recording_trigger(self):
        service = VoiceAgentService()
        state = ConversationState(call_sid="test_123")
        state.current_step = ConversationStep.SYMPTOMS
        
        # Test 1: Explicit trigger ("check my cough") -> RECORDING_INTRO
        next_step = service._determine_next_step(state, "I want to check my cough")
        assert next_step == ConversationStep.RECORDING_INTRO

    def test_determine_next_step_turn_count(self):
        service = VoiceAgentService()
        state = ConversationState(call_sid="test_123")
        state.current_step = ConversationStep.SYMPTOMS
        
        # Test 2: Turn count logic
        state.turn_count = 1
        assert service._determine_next_step(state, "My throat hurts") == ConversationStep.SYMPTOMS
        
        state.turn_count = 3  # Threshold reached
        assert service._determine_next_step(state, "My throat hurts") == ConversationStep.RECORDING_INTRO

    def test_determine_next_step_questions_stay_put(self):
        service = VoiceAgentService()
        state = ConversationState(call_sid="test_123")
        state.current_step = ConversationStep.SYMPTOMS
        state.turn_count = 5 # Even above threshold
        
        # Test 3: Questions preventing transition
        assert service._determine_next_step(state, "Why do you need that?") == ConversationStep.SYMPTOMS

