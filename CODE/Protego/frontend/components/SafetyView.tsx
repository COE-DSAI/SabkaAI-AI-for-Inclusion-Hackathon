'use client'

import { Shield, Map } from 'lucide-react';

export default function SafetyView() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 hover-lift">
        <h3 className="font-semibold text-xl sm:text-2xl text-gray-800 mb-4 sm:mb-6">Security & Privacy</h3>
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-green-50 rounded-lg sm:rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-slide-in-left">
            <Shield className="text-green-600 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">End-to-End Encryption</h4>
              <p className="text-xs sm:text-sm text-gray-600">All data encrypted securely with industry-standard protocols</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-slide-in-left stagger-1">
            <Map className="text-blue-600 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Location Privacy</h4>
              <p className="text-xs sm:text-sm text-gray-600">Shared only with trusted contacts during emergencies</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-purple-50 rounded-lg sm:rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-slide-in-left stagger-2">
            <Shield className="text-purple-600 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Secure Authentication</h4>
              <p className="text-xs sm:text-sm text-gray-600">JWT-based authentication with bcrypt password hashing</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-orange-500 w-8 h-8" />
          <h3 className="font-bold text-xl sm:text-2xl text-gray-900">Privacy Policy</h3>
        </div>

        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            We respect your privacy and work to protect your personal information.
          </p>

          <ul className="space-y-3 ml-4">
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We only collect information you provide directly, such as your name, email address, or messages you send us.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We do not track pages visited, use analytics tools, cookies, or other tracking technologies.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We do not create logs of your data or activity unless a security threat is reported.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We use your information only to respond to you and operate this website.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We do not sell your personal data and only share it if required by law.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>We use reasonable security measures to help protect your information.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>You can contact us to ask about, update, or delete your personal information where possible.</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-3 text-lg">•</span>
              <span>If this policy changes, we will update this page with a new effective date.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
