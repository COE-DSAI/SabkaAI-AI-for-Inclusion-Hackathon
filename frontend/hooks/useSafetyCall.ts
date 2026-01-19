/**
 * Safety call hook - manages AI-powered fake safety call state.
 */

import { useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

interface SafetyCallHookReturn {
  callActive: boolean
  calling: boolean
  muted: boolean
  transcript: string[]
  sessionId: string
  distressDetected: boolean
  startCall: (location?: { latitude: number; longitude: number }) => Promise<void>
  startVonageCall: (location?: { latitude: number; longitude: number }) => Promise<void>
  endCall: () => Promise<void>
  toggleMute: () => void
  error: string | null
}

export function useSafetyCall(): SafetyCallHookReturn {
  const [callActive, setCallActive] = useState(false)
  const [calling, setCalling] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [distressDetected, setDistressDetected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCall = useCallback(async (location?: { latitude: number; longitude: number }) => {
    setCalling(true)
    setError(null)

    try {
      // 1. Start call session in backend
      const response = await api.post('/safety-call/start', {
        location: location || null
      })

      const { session_id, connection, system_instructions } = response.data
      setSessionId(session_id)

      // 2. Connect to Azure Realtime WebSocket
      const ws = new WebSocket(connection.url)
      wsRef.current = ws

      ws.onopen = async () => {
        console.log('✅ WebSocket connected')

        // Configure session with safety call instructions
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: system_instructions,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.8,
            max_response_output_tokens: 150
          }
        }))

        // Start microphone
        await startMicrophone()

        setCalling(false)
        setCallActive(true)
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)

        // User's speech transcribed
        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const userTranscript = data.transcript
          setTranscript(prev => [...prev, `You: ${userTranscript}`])

          // Send to backend for distress detection
          try {
            const result = await api.post('/safety-call/transcript', {
              session_id,
              transcript: userTranscript,
              speaker: 'user'
            })

            if (result.data.status === 'distress_detected') {
              setDistressDetected(true)
            }
          } catch (err) {
            console.error('Failed to process transcript:', err)
          }
        }

        // AI response (text)
        if (data.type === 'response.done') {
          const aiText = data.response.output[0]?.content?.[0]?.transcript
          if (aiText) {
            setTranscript(prev => [...prev, `Friend: ${aiText}`])
          }
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setCalling(false)
        setError('Failed to connect to safety call service')
      }

    } catch (err: any) {
      console.error('Failed to start call:', err)
      setCalling(false)
      setError(err.response?.data?.detail || 'Failed to start safety call')
    }
  }, [])

  const startMicrophone = async () => {
    // Request microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    })
    streamRef.current = stream

    // Create audio context
    const audioContext = new AudioContext({ sampleRate: 24000 })
    audioContextRef.current = audioContext

    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (muted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return
      }

      // Convert Float32 to PCM16
      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
      }

      // Encode to base64
      const uint8 = new Uint8Array(pcm16.buffer)
      let binary = ''
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i])
      }
      const base64 = btoa(binary)

      // Send to Azure
      wsRef.current!.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
      }))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  const endCall = useCallback(async () => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    // End session in backend
    if (sessionId) {
      try {
        await api.post(`/safety-call/end/${sessionId}`)
      } catch (err) {
        console.error('Failed to end call:', err)
      }
    }

    setCallActive(false)
    setCalling(false)
    setSessionId('')
    setTranscript([])
    setDistressDetected(false)
  }, [sessionId])

  const startVonageCall = useCallback(async (location?: { latitude: number; longitude: number }) => {
    setCalling(true)
    setError(null)

    try {
      // Initiate Vonage outbound call to user's phone
      const response = await api.post('/safety-call/vonage/initiate', {
        location: location || null
      })

      if (response.data.success) {
        setCallActive(true)
        setSessionId(response.data.call_uuid)
        setCalling(false)

        // The call will actually ring the user's phone
        // No WebSocket needed - Vonage handles the call
      } else {
        throw new Error(response.data.error || 'Failed to initiate call')
      }
    } catch (err: any) {
      console.error('Failed to start Vonage call:', err)
      setCalling(false)
      setError(err.response?.data?.detail || 'Failed to initiate phone call')
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev)
  }, [])

  return {
    callActive,
    calling,
    muted,
    transcript,
    sessionId,
    distressDetected,
    startCall,
    startVonageCall,
    endCall,
    toggleMute,
    error
  }
}
