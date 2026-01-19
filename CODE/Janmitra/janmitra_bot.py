#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""simple-chatbot - Pipecat Voice Agent

This module implements a chatbot using Google's Gemini Live model for natural language
processing. It includes:
- Real-time audio/video interaction through Daily
- Animated robot avatar

The bot runs as part of a pipeline that processes audio/video frames and manages
the conversation flow.

Required AI services:
- Gemini Live (LLM)

Run the bot using::

    uv run bot.py
"""

import argparse
import os

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frameworks.rtvi import RTVIObserver, RTVIProcessor
from pipecat.runner.types import RunnerArguments, SmallWebRTCRunnerArguments
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.turns.user_stop.turn_analyzer_user_turn_stop_strategy import (
    TurnAnalyzerUserTurnStopStrategy,
)
from pipecat.turns.user_turn_strategies import UserTurnStrategies

load_dotenv(override=True)


async def run_bot(transport: BaseTransport):
    """Main bot execution function.

    Sets up and runs the bot pipeline including:
    - Gemini Live model integration
    - Voice activity detection
    - Animation processing
    - RTVI event handling
    """

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not set")

    system_instruction = "You are Janmitra, a helpful voice assistant for rural Indians. Speak only in Hindi or Bundeli dialect. Provide factual information about government schemes, loans, and services. Cite sources when possible."

    # Initialize the Gemini Live model
    llm = GeminiLiveLLMService(
        api_key=api_key,
        model="models/gemini-2.5-flash-native-audio-preview-12-2025",
        voice_id="Charon",  # Aoede, Charon, Fenrir, Kore, Puck
        system_instruction=system_instruction,
    )

    messages = [
        {
            "role": "user",
            "content": "You are Janmitra, a voice assistant for government information in rural India. Your output will be converted to audio so don't include special characters in your answers. Respond to what the user said in a helpful way, but keep your responses brief. Start by introducing yourself in Hindi.",
        },
    ]  # type: ignore

    # Set up conversation context and management
    # The context_aggregator will automatically collect conversation context
    context = LLMContext(messages)  # type: ignore
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_strategies=UserTurnStrategies(
                stop=[TurnAnalyzerUserTurnStopStrategy(turn_analyzer=LocalSmartTurnAnalyzerV3())]
            )
        ),
    )

    rtvi = RTVIProcessor()

    # Pipeline - assembled from reusable components
    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            user_aggregator,
            llm,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[
            RTVIObserver(rtvi),
        ],
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        await rtvi.set_bot_ready()
        # Kick off the conversation
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point."""

    transport = None

    match runner_args:
        case SmallWebRTCRunnerArguments():
            webrtc_connection: SmallWebRTCConnection = runner_args.webrtc_connection

            transport = SmallWebRTCTransport(
                webrtc_connection=webrtc_connection,
                params=TransportParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    video_out_enabled=False,
                    vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.2)),
                ),
            )
        case _:
            logger.error(f"Unsupported runner arguments type: {type(runner_args)}")
            return

    await run_bot(transport)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Janmitra voice bot")
    parser.add_argument(
        "--transport", choices=["webrtc"], default="webrtc", help="Transport type (default: webrtc)"
    )
    args = parser.parse_args()

    if args.transport == "webrtc":
        from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
        import asyncio

        connection = SmallWebRTCConnection()
        runner_args = SmallWebRTCRunnerArguments(webrtc_connection=connection)
        asyncio.run(bot(runner_args))
    else:
        logger.error("Unsupported transport")
