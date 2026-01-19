import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Zap, HelpCircle } from 'lucide-react';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action hint
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  lang?: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ 
  steps, 
  onComplete, 
  onSkip,
  lang = 'en' 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Find and highlight target element
  useEffect(() => {
    if (!step) return;

    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Gentle scroll to element (not aggressive)
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', // Only scroll if needed
        inline: 'nearest' 
      });
      
      // Wait for scroll to settle
      setTimeout(() => {
        // Get element position after scroll
        const rect = element.getBoundingClientRect();
        const position = step.position || 'bottom';
        
        // Responsive tooltip sizing
        const isMobile = window.innerWidth < 768;
        const tooltipWidth = isMobile ? Math.min(window.innerWidth - 32, 340) : 380;
        const tooltipHeight = isMobile ? 180 : 220;
        const gap = isMobile ? 12 : 16;
        const padding = isMobile ? 12 : 16;
        
        let top = 0;
        let left = 0;
        
        // Mobile: always bottom or top (simpler)
        if (isMobile) {
          if (rect.bottom + tooltipHeight + gap < window.innerHeight - padding) {
            // Bottom
            top = rect.bottom + gap;
            left = Math.max(padding, Math.min(
              (window.innerWidth - tooltipWidth) / 2,
              window.innerWidth - tooltipWidth - padding
            ));
          } else {
            // Top
            top = Math.max(padding, rect.top - tooltipHeight - gap);
            left = Math.max(padding, Math.min(
              (window.innerWidth - tooltipWidth) / 2,
              window.innerWidth - tooltipWidth - padding
            ));
          }
        } else {
          // Desktop: use specified position
          switch (position) {
            case 'top':
              top = rect.top - tooltipHeight - gap;
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
              break;
            case 'bottom':
              top = rect.bottom + gap;
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
              break;
            case 'left':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
              left = rect.left - tooltipWidth - gap;
              break;
            case 'right':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
              left = rect.right + gap;
              break;
          }
          
          // Smart flip if out of bounds
          if (top < padding) {
            top = rect.bottom + gap;
          }
          if (top + tooltipHeight > window.innerHeight - padding) {
            top = rect.top - tooltipHeight - gap;
          }
          if (left < padding) {
            left = padding;
          }
          if (left + tooltipWidth > window.innerWidth - padding) {
            left = window.innerWidth - tooltipWidth - padding;
          }
        }
        
        setTooltipPosition({ top, left });
      }, 300); // Wait for scroll animation
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!step) return null;

  return (
    <>
      {/* Light Overlay - barely visible */}
      <div className="fixed inset-0 z-[9998] bg-black/20" onClick={handleSkip} />
      
      {/* Spotlight on target - NO blur, just highlight */}
      {targetElement && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 8,
            left: targetElement.getBoundingClientRect().left - 8,
            width: targetElement.getBoundingClientRect().width + 16,
            height: targetElement.getBoundingClientRect().height + 16,
            border: '3px solid #c8e038',
            borderRadius: '12px',
            boxShadow: '0 0 0 4px rgba(200, 224, 56, 0.2), 0 0 30px rgba(200, 224, 56, 0.4)',
            animation: 'pulse 2s infinite'
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="fixed z-[10000] bg-[var(--bg-card)] border-2 border-[#c8e038] rounded-2xl shadow-2xl p-4 md:p-6 w-[calc(100vw-32px)] md:w-[380px] max-w-[380px]"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg md:text-xl font-bold">{step.title}</span>
              <button onClick={handleSkip} className="ml-auto p-1 hover:bg-[var(--bg-glass)] rounded-lg transition-colors">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              {currentStep + 1}/{steps.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[var(--bg-glass)] rounded-full mb-3 md:mb-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Description */}
        <p className="text-[var(--text-main)] text-sm md:text-base leading-relaxed mb-3 md:mb-4">
          {step.description}
        </p>

        {/* Action Hint */}
        {step.action && (
          <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl p-2 md:p-3 mb-3 md:mb-4">
            <p className="text-[var(--primary)] text-xs md:text-sm font-medium flex items-center gap-2">
              <Zap size={14} className="shrink-0" />
              <span>{step.action}</span>
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          {currentStep === 0 ? (
            <button
              onClick={handleSkip}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs md:text-sm font-medium transition-colors"
            >
              {lang === 'en' ? 'Skip Tour' : 'टूर छोड़ें'}
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--bg-input)] transition-colors text-sm md:text-base"
            >
              <ChevronLeft size={16} />
              {lang === 'en' ? 'Back' : 'पीछे'}
            </button>
          )}

          <button
            onClick={currentStep === steps.length - 1 ? onComplete : handleNext}
            className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl bg-[#c8e038] hover:bg-[#b0c930] text-[#0a1f1a] font-bold transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
          >
            {currentStep === steps.length - 1 
              ? (lang === 'en' ? 'Finish' : 'समाप्त')
              : (lang === 'en' ? 'Next' : 'आगे')
            }
            {currentStep < steps.length - 1 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
};

// Helper button component
interface TourButtonProps {
  onClick: () => void;
  lang?: string;
}

export const TourButton: React.FC<TourButtonProps> = ({ onClick, lang = 'en' }) => {
  return (
    <button
      onClick={onClick}
      className="p-2.5 bg-[var(--bg-glass)] hover:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl transition-all flex items-center justify-center gap-2 text-[var(--text-main)] hover:border-[#c8e038]"
      title={lang === 'en' ? 'Start Guided Tour' : 'निर्देशित टूर शुरू करें'}
    >
      <HelpCircle size={20} />
    </button>
  );
};

// Check if user has completed tour
export const hasCompletedTour = (tourId: string): boolean => {
  return localStorage.getItem(`tour_completed_${tourId}`) === 'true';
};

// Mark tour as completed
export const markTourCompleted = (tourId: string): void => {
  localStorage.setItem(`tour_completed_${tourId}`, 'true');
};

// Reset tour (for testing or user request)
export const resetTour = (tourId: string): void => {
  localStorage.removeItem(`tour_completed_${tourId}`);
};
