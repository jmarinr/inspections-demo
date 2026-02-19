import React from 'react';
import { useInspectionStore } from './stores/inspectionStore';
import { WizardLayout } from './components/layout';
import {
  StartStep,
  IdentityStep,
  VehiclePhotosStep,
  VehicleDataStep,
  DamagePhotosStep,
  ThirdPartyStep,
  SceneStep,
  SummaryStep,
} from './components/steps';

const App: React.FC = () => {
  const { currentStep } = useInspectionStore();

  // Render the current step
  // New order:
  // 0: Start - Basic info
  // 1: Identity - ID photos + OCR
  // 2: Vehicle Photos - 12 photos (includes plate OCR)
  // 3: Vehicle Data - Pre-filled with OCR data from photos
  // 4: Damage Photos - Damage documentation
  // 5: Third Party - If applicable
  // 6: Scene - GPS and description
  // 7: Summary - Review + Consent + Signature at the END
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StartStep />;
      case 1:
        return <IdentityStep />;
      case 2:
        return <VehiclePhotosStep />;
      case 3:
        return <VehicleDataStep />;
      case 4:
        return <DamagePhotosStep />;
      case 5:
        return <ThirdPartyStep />;
      case 6:
        return <SceneStep />;
      case 7:
        return <SummaryStep />;
      default:
        return <StartStep />;
    }
  };

  return (
    <WizardLayout>
      {renderStep()}
    </WizardLayout>
  );
};

export default App;
