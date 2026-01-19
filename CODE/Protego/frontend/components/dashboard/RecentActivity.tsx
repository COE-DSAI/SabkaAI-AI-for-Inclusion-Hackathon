'use client'

import { Radio, MoreVertical, Clock } from 'lucide-react';

interface Alert {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

interface RecentActivityProps {
  alerts: Alert[];
}

// Helper to format relative time
function formatRelativeTime(timestamp: string): string {
  // Validate timestamp
  if (!timestamp) return 'Unknown time';

  const now = new Date();
  const alertTime = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(alertTime.getTime())) return 'Unknown time';

  const diffMs = now.getTime() - alertTime.getTime();

  // Handle negative differences (future dates) or invalid calculations
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';

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

// Helper to get alert status
function getAlertStatus(alert: Alert) {
  if (alert.type === 'emergency' || alert.message.includes('SOS') || alert.message.includes('EMERGENCY')) {
    return { dotColor: 'bg-red-500' };
  }
  if (alert.type === 'warning') {
    return { dotColor: 'bg-orange-500' };
  }
  return { dotColor: 'bg-green-500' };
}

export default function RecentActivity({ alerts }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Radio size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest safety alerts</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MoreVertical size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Alerts List */}
      <div className="p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No Recent Activity</p>
            <p className="text-sm text-gray-500 mt-2">All systems operational</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const status = getAlertStatus(alert);
              const relativeTime = formatRelativeTime(alert.timestamp);

              return (
                <div
                  key={alert.id}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 animate-slide-in-left"
                >
                  <div className={`w-2 h-2 rounded-full ${status.dotColor} mt-2 flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
