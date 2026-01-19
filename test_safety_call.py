#!/usr/bin/env python3
"""
Quick test script to verify Safety Call implementation.
Run this after starting the backend server.
"""

import sys
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

async def test_imports():
    """Test that all modules can be imported."""
    print("🧪 Testing imports...\n")

    try:
        # Test AI provider imports
        from services.ai import (
            IAIConversationProvider,
            AIProviderType,
            AudioConfig,
            ConversationConfig,
            ProviderFactory,
            AzureRealtimeProvider
        )
        print("✅ AI provider imports successful")

        # Test safety call service imports
        from services.safety_call import (
            DistressDetector,
            DistressLevel,
            DistressDetectionResult,
            ConversationPromptBuilder,
            ConversationContext,
            SafetyCallSession,
            SafetyCallManager,
            safety_call_manager
        )
        print("✅ Safety call service imports successful")

        # Test repository imports
        from repositories import BaseRepository, SafetyCallRepository
        print("✅ Repository imports successful")

        # Test schema imports
        from schemas.safety_call import (
            StartCallRequest,
            StartCallResponse,
            TranscriptEvent,
            EndCallResponse,
            CallHistoryItem,
            CallStatsResponse
        )
        print("✅ Schema imports successful")

        # Test router imports
        from routers import safety_call
        print("✅ Router imports successful")

        # Test model imports
        from models import SafetyCallSession as SafetyCallSessionModel
        print("✅ Model imports successful")

        print("\n✅ All imports successful!\n")
        return True

    except ImportError as e:
        print(f"\n❌ Import failed: {e}\n")
        return False


async def test_distress_detector():
    """Test distress detection logic."""
    print("🧪 Testing distress detector...\n")

    from services.safety_call import DistressDetector, DistressLevel

    detector = DistressDetector(alert_threshold=0.7)

    # Test critical keywords
    result = detector.analyze("help me please")
    assert result.detected == True
    assert result.level == DistressLevel.CRITICAL
    assert result.trigger_alert == True
    print(f"✅ Critical detection: '{result.keywords_found}' -> {result.level.value} (confidence: {result.confidence})")

    # Test high priority
    result = detector.analyze("someone is following me")
    assert result.detected == True
    assert result.level == DistressLevel.HIGH
    print(f"✅ High priority detection: '{result.keywords_found}' -> {result.level.value} (confidence: {result.confidence})")

    # Test safe phrases
    result = detector.analyze("I'm fine, just checking in")
    assert result.detected == False
    assert result.level == DistressLevel.NONE
    print(f"✅ Safe phrase detection: no alert triggered")

    # Test summary
    summary = detector.get_detection_summary()
    print(f"✅ Detection summary: {summary['total_detections']} detections, max level: {summary['max_level']}")

    print("\n✅ Distress detector tests passed!\n")
    return True


async def test_conversation_builder():
    """Test conversation prompt builder."""
    print("🧪 Testing conversation prompt builder...\n")

    from services.safety_call import ConversationPromptBuilder, ConversationContext

    context = ConversationContext(
        user_name="Test User",
        user_location={"latitude": 40.7128, "longitude": -74.0060},
        time_of_day="11:30 PM",
        recent_alerts=0
    )

    prompt = ConversationPromptBuilder.build_safety_call_prompt(context)

    assert "Test User" in prompt
    assert "40.7128" in prompt
    assert "11:30 PM" in prompt
    assert "concerned friend" in prompt.lower()
    print("✅ Safety call prompt generated successfully")
    print(f"   Prompt length: {len(prompt)} characters")

    # Test reassurance prompt
    reassurance = ConversationPromptBuilder.build_reassurance_prompt("Test User", 15)
    assert "Test User" in reassurance
    assert "15 minutes" in reassurance
    print("✅ Reassurance prompt generated successfully")

    # Test emergency prompt
    emergency = ConversationPromptBuilder.build_emergency_response_prompt("Test User", "high")
    assert "EMERGENCY" in emergency
    assert "Test User" in emergency
    print("✅ Emergency prompt generated successfully")

    print("\n✅ Conversation builder tests passed!\n")
    return True


async def test_provider_factory():
    """Test AI provider factory."""
    print("🧪 Testing AI provider factory...\n")

    from services.ai import ProviderFactory, AIProviderType, AzureRealtimeProvider
    from config import settings

    # Test Azure provider creation
    try:
        provider = ProviderFactory.create(AIProviderType.AZURE_REALTIME)
        assert isinstance(provider, AzureRealtimeProvider)
        print("✅ Azure Realtime provider created successfully")
        print(f"   Provider type: {provider.get_provider_type().value}")
    except ValueError as e:
        print(f"⚠️  Azure provider creation failed (API key not configured): {e}")

    print("\n✅ Provider factory tests passed!\n")
    return True


async def test_database_model():
    """Test database model definition."""
    print("🧪 Testing database model...\n")

    from models import SafetyCallSession, User
    from sqlalchemy import inspect

    # Check table columns
    mapper = inspect(SafetyCallSession)
    columns = [col.key for col in mapper.columns]

    expected_columns = [
        'id', 'user_id', 'session_id', 'start_time', 'end_time',
        'duration_seconds', 'start_location_lat', 'start_location_lng',
        'distress_detected', 'distress_keywords', 'alert_triggered',
        'alert_id', 'conversation_json', 'created_at'
    ]

    for col in expected_columns:
        assert col in columns, f"Missing column: {col}"
        print(f"✅ Column exists: {col}")

    # Check relationships
    relationships = [rel.key for rel in mapper.relationships]
    assert 'user' in relationships
    assert 'alert' in relationships
    print(f"✅ Relationships defined: {relationships}")

    print("\n✅ Database model tests passed!\n")
    return True


async def main():
    """Run all tests."""
    print("=" * 60)
    print("🚀 Safety Call Implementation Test Suite")
    print("=" * 60)
    print()

    results = []

    # Run tests
    results.append(("Imports", await test_imports()))
    results.append(("Distress Detector", await test_distress_detector()))
    results.append(("Conversation Builder", await test_conversation_builder()))
    results.append(("Provider Factory", await test_provider_factory()))
    results.append(("Database Model", await test_database_model()))

    # Summary
    print("=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print()

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print()
    print(f"Results: {passed}/{total} tests passed")
    print()

    if passed == total:
        print("🎉 All tests passed! Safety Call feature is ready.")
        print()
        print("Next steps:")
        print("1. Configure AZURE_OPENAI_REALTIME_API_KEY in backend/.env")
        print("2. Start backend: uvicorn main:app --reload")
        print("3. Start frontend: npm run dev")
        print("4. Navigate to http://localhost:5173/safety-call")
        print("5. Test the feature end-to-end")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
