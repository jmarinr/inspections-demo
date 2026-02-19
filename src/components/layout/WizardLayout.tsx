import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useInspectionStore } from '../../stores/inspectionStore';
import { ProgressBar, ThemeToggle } from '../ui';
import { WIZARD_STEPS } from '../../lib/constants';

interface WizardLayoutProps {
  children: React.ReactNode;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({ children }) => {
  const { currentStep, prevStep } = useInspectionStore();

  if (currentStep === 0) {
    return <>{children}</>;
  }

  const totalSteps = WIZARD_STEPS.length - 1;
  const progress = (currentStep / totalSteps) * 100;
  const currentStepInfo = WIZARD_STEPS[currentStep];

  const handleBack = () => {
    if (currentStep > 0) {
      prevStep();
    }
  };

  const handleClose = () => {
    if (confirm('¿Seguro que quieres salir? Tu progreso se guardará localmente.')) {
      window.location.hash = '/';
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {currentStepInfo?.title}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentStepInfo?.subtitle}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={handleClose}
              className="p-2 -mr-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar progress={progress} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {currentStep}/{totalSteps}
            </span>
          </div>
        </div>
      </header>

      {/* Step Pills */}
      <div className="px-4 py-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex gap-2 min-w-max">
          {WIZARD_STEPS.slice(1).map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            return (
              <div
                key={step.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
                style={{
                  backgroundColor: isActive ? 'rgba(236, 72, 153, 0.1)' : isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input)',
                  color: isActive ? 'var(--hk-primary)' : isCompleted ? '#34d399' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--hk-primary)' : '1px solid transparent',
                }}
              >
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: isActive ? 'var(--hk-primary)' : isCompleted ? '#10b981' : 'var(--border-color)',
                    color: isActive || isCompleted ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {isCompleted ? '✓' : stepNumber}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          HenkanCX • Información protegida
        </p>
      </footer>
    </div>
  );
};
