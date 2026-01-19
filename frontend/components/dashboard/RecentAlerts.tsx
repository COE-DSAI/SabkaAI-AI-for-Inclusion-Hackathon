'use client'

import { Radio, MoreVertical, Clock } from 'lucide-react';

interface Alert {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

interface RecentAlertsProps {
  alerts: Alert[];
}

// Helper to format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffMs = now.getTime() - alertTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// Helper to get status info
function getAlertStatus(alert: Alert) {
  if (alert.type === 'emergency' || alert.message.includes('SOS') || alert.message.includes('EMERGENCY')) {
    return { status: 'On Scene', color: 'text-orange-500', bgColor: 'bg-orange-50', dotColor: 'bg-orange-500' };
  }
  if (alert.type === 'warning') {
    return { status: 'Responding', color: 'text-orange-500', bgColor: 'bg-orange-50', dotColor: 'bg-orange-500' };
  }
  return { status: 'Available', color: 'text-green-500', bgColor: 'bg-green-50', dotColor: 'bg-green-500' };
}

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  // Mock alerts with proper statuses for demo
  const mockAlerts = [
    { id: 'A-12', type: 'Ambulance', status: 'Responding', location: 'En route to INC-2846', statusColor: 'orange', eta: '3 min' },
    { id: 'F-03', type: 'Fire Engine', status: 'On Scene', location: '425 Industrial Ave', statusColor: 'orange', eta: null },
    { id: 'P-07', type: 'Police', status: 'Available', location: 'Patrol Zone 4', statusColor: 'green', eta: null },
    { id: 'A-05', type: 'Ambulance', status: 'Available', location: 'Station 2', statusColor: 'green', eta: null },
    { id: 'F-01', type: 'Fire Engine', status: 'Responding', location: 'En route to INC-2847', statusColor: 'orange', eta: '7 min' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Radio size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Unit Status</h3>
            <p className="text-sm text-gray-500">Real-time fleet monitoring</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MoreVertical size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Units List */}
      <div className="p-6 space-y-4">
        {mockAlerts.map((unit, index) => (
          <div
            key={unit.id}
            style={{ animationDelay: `${index * 0.05}s` }}
            className="flex items-center justify-between animate-slide-in-left"
          >
            {/* Left side: ID and Type */}
            <div className="flex items-center gap-4 flex-1">
              <div>
                <div className="font-bold text-gray-900">{unit.id}</div>
                <div className="text-xs text-gray-500">{unit.type}</div>
              </div>
            </div>

            {/* Middle: Status and Location */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${unit.statusColor === 'orange' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span className={`text-sm font-semibold ${unit.statusColor === 'orange' ? 'text-orange-600' : 'text-green-600'}`}>
                  {unit.status}
                </span>
              </div>
              <div className="text-xs text-gray-600">{unit.location}</div>
            </div>

            {/* Right side: ETA if exists */}
            {unit.eta && (
              <div className="text-right">
                <div className="text-xs text-gray-500">ETA: {unit.eta}</div>
              </div>
            )}
          </div>
        ))}

        {/* If there are real alerts, show them below */}
        {alerts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Alerts</h4>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert, index) => {
                const status = getAlertStatus(alert);
                const relativeTime = formatRelativeTime(alert.timestamp);

                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className={`w-2 h-2 rounded-full ${status.dotColor}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{alert.message}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Clock size={10} />
                        <span>{relativeTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
