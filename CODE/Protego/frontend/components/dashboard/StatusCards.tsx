'use client'

import { useState } from 'react';
import { Activity, Navigation, Users, Shield, Info, X } from 'lucide-react';

interface StatusCardsProps {
  safetyScore: number | null;
  walkingStatus: string;
  isWalking: boolean;
  trustedContactsCount: number;
  locationAvailable: boolean;
  locationPrompt?: string;
  calculatingScore?: boolean;
  scoreBreakdown?: any;
}

export default function StatusCards({
  safetyScore,
  walkingStatus,
  isWalking,
  trustedContactsCount,
  locationAvailable,
  locationPrompt,
  calculatingScore,
  scoreBreakdown
}: StatusCardsProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Get color gradient based on safety score
  const getScoreGradient = (score: number | null) => {
    if (score === null) return 'from-gray-400 to-gray-500';
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    if (score >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Safety Score Card - Color varies by score */}
        <div
          onClick={() => locationAvailable && safetyScore !== null && setShowScoreModal(true)}
          className={`bg-gradient-to-br ${getScoreGradient(safetyScore)} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-fade-in ${locationAvailable && safetyScore !== null ? 'cursor-pointer' : ''}`}
        >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-white/90">Safety Score</h3>
              {calculatingScore || !locationAvailable ? (
                <Info size={14} className="text-white/70" />
              ) : (
                <Activity size={14} className="text-white/90" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {calculatingScore ? (
            <>
              <p className="text-5xl sm:text-6xl font-bold text-white mb-2">--</p>
              <p className="text-sm text-white/80">Calculating...</p>
            </>
          ) : locationAvailable && safetyScore !== null ? (
            <>
              <p className="text-5xl sm:text-6xl font-bold text-white mb-2">{safetyScore}</p>
              <p className="text-sm text-white/90">
                {walkingStatus === 'safe' ? 'Stay alert' :
                 walkingStatus === 'caution' ? 'Stay alert' :
                 walkingStatus === 'unknown' ? 'Stay alert' :
                 'High risk'}
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl sm:text-6xl font-bold text-white mb-2">--</p>
              <p className="text-sm text-white/80">Enable location</p>
            </>
          )}
        </div>
      </div>

      {/* Walk Status Card - Blue */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-fade-in stagger-1">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-white/90">Walk Status</h3>
              <Navigation size={14} className="text-white/90" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-4xl sm:text-5xl font-bold text-white mb-2">
            {isWalking ? 'Active' : 'Inactive'}
          </p>
          <p className="text-sm text-white/90">
            {isWalking ? 'Start walk mode' : 'Start walk mode'}
          </p>
        </div>
      </div>

      {/* Trusted Contacts Card - Purple */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-fade-in stagger-2">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-white/90">Trusted Contacts</h3>
              <Users size={14} className="text-white/90" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-5xl sm:text-6xl font-bold text-white mb-2">{trustedContactsCount}</p>
          <p className="text-sm text-white/90">Ready to help</p>
        </div>
      </div>
    </div>

      {/* Safety Score Modal */}
      {showScoreModal && scoreBreakdown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowScoreModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`bg-gradient-to-r ${getScoreGradient(safetyScore)} p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Safety Score Breakdown</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold">{safetyScore}</span>
                    <span className="text-xl">/100</span>
                  </div>
                </div>
                <button onClick={() => setShowScoreModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                <p className="text-gray-700 capitalize">{scoreBreakdown.status || walkingStatus}</p>
              </div>

              {/* Factors */}
              {scoreBreakdown.factors && scoreBreakdown.factors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contributing Factors</h3>
                  <ul className="space-y-2">
                    {scoreBreakdown.factors.map((factor: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score Components */}
              {scoreBreakdown.score_components && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Score Components</h3>
                  <div className="space-y-3">
                    {Object.entries(scoreBreakdown.score_components).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-semibold text-gray-900">{value}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getScoreGradient(value)}`}
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Info */}
              {scoreBreakdown.location_available && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Location Details</h3>
                  <p className="text-xs text-gray-600">Score calculated based on current location and historical safety data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
