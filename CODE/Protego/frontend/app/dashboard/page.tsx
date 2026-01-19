'use client'

import DashboardLayout from '@/components/DashboardLayout'
import StatusCards from '@/components/dashboard/StatusCards'
import WalkControl from '@/components/dashboard/WalkControl'
import LiveTrackingMap from '@/components/dashboard/LiveTrackingMap'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { SafetySummary, AIChatAssistant } from '@/components/ai'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {({
        safetyScore,
        walkingStatus,
        isWalking,
        activeSession,
        location,
        voiceEnabled,
        isListening,
        isAnalyzing,
        voiceLogs,
        lastAnalysisResult,
        loading,
        alerts,
        user,
        handleStartWalk,
        handleStopWalk,
        toggleVoiceRecognition,
        clearVoiceLogs,
        addAlert,
        locationAvailable,
        locationPrompt,
        calculatingScore,
        scoreBreakdown,
      }) => (
        <>
          {/* Status Cards */}
          <StatusCards
            safetyScore={safetyScore}
            walkingStatus={walkingStatus}
            isWalking={isWalking}
            trustedContactsCount={user?.trusted_contacts?.length || 0}
            locationAvailable={locationAvailable}
            locationPrompt={locationPrompt}
            calculatingScore={calculatingScore}
            scoreBreakdown={scoreBreakdown}
          />

          {/* Walk Control */}
          <WalkControl
            isWalking={isWalking}
            activeSession={activeSession}
            location={location}
            voiceEnabled={voiceEnabled}
            isListening={isListening}
            isAnalyzing={isAnalyzing}
            voiceLogs={voiceLogs}
            lastAnalysisResult={lastAnalysisResult}
            loading={loading}
            onStartWalk={handleStartWalk}
            onStopWalk={handleStopWalk}
            onToggleVoice={toggleVoiceRecognition}
            onClearVoiceLogs={clearVoiceLogs}
          />

          {/* Two Column Layout: Map + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Tracking Map - Takes 1 column */}
            <div>
              <LiveTrackingMap userLocation={location} />
            </div>

            {/* Recent Activity - Takes 1 column */}
            <div>
              <RecentActivity alerts={alerts} />
            </div>
          </div>

          {/* AI Safety Summary - Shows after walk ends */}
          {!isWalking && activeSession && (
            <SafetySummary sessionId={activeSession.id} compact />
          )}

          {/* AI Chat Assistant - Floating button */}
          <AIChatAssistant floating />
        </>
      )}
    </DashboardLayout>
  );
}
