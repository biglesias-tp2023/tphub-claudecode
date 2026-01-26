/**
 * Campaign Editor
 *
 * Multi-step wizard modal for creating promotional campaigns.
 * Guides users through platform selection, campaign type, configuration,
 * date selection, and final review before creation.
 *
 * ## Wizard Steps
 *
 * 1. **Platform**: Select Glovo, UberEats, JustEat, or Google Ads
 * 2. **Type**: Choose campaign type (BOGO, discount, free delivery, etc.)
 * 3. **Config**: Dynamic form fields based on campaign type
 * 4. **Dates**: Select start/end dates with event/weather hints
 * 5. **Review**: Summary before creation
 *
 * ## Error Handling
 *
 * - Displays error message if campaign creation fails
 * - Maintains form state so user can retry without losing data
 *
 * @module features/calendar/components/CampaignEditor
 */

import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PlatformSelector } from './PlatformSelector';
import { CampaignTypeSelector } from './CampaignTypeSelector';
import { ConfigForm } from './ConfigForm';
import { DateRangePicker } from './DateRangePicker';
import { ReviewStep } from './ReviewStep';
import { getCampaignTypeConfig } from '../../config/platforms';
import type {
  CampaignPlatform,
  CampaignConfig,
  PromotionalCampaignInput,
  Restaurant,
  CalendarEvent,
  WeatherForecast,
} from '@/types';

// ============================================
// TYPES
// ============================================

interface CampaignEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaign: PromotionalCampaignInput) => Promise<void>;
  restaurant: Restaurant | null;
  upcomingEvents?: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
  initialDate?: string;
}

type Step = 'platform' | 'type' | 'config' | 'dates' | 'review';

const STEPS: Step[] = ['platform', 'type', 'config', 'dates', 'review'];

const STEP_LABELS: Record<Step, string> = {
  platform: 'Plataforma',
  type: 'Tipo',
  config: 'Configuracion',
  dates: 'Fechas',
  review: 'Revisar',
};

export function CampaignEditor({
  isOpen,
  onClose,
  onSave,
  restaurant,
  upcomingEvents = [],
  weatherForecasts = [],
  initialDate,
}: CampaignEditorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('platform');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState<CampaignPlatform | null>(null);
  const [campaignType, setCampaignType] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [config, setConfig] = useState<CampaignConfig>({});
  const [productIds, setProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'platform':
        return platform !== null;
      case 'type':
        return campaignType !== null;
      case 'config': {
        if (!platform || !campaignType) return false;
        const typeConfig = getCampaignTypeConfig(platform, campaignType);
        if (!typeConfig) return false;
        // Check required fields
        return typeConfig.fields
          .filter(f => f.required && f.type !== 'product' && f.type !== 'products')
          .every(f => {
            const value = config[f.key as keyof CampaignConfig];
            return value !== undefined && value !== null && value !== '';
          });
      }
      case 'dates':
        return startDate && endDate && startDate <= endDate;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, platform, campaignType, config, startDate, endDate]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  }, [currentStepIndex]);

  const handleSubmit = useCallback(async () => {
    if (!platform || !campaignType || !restaurant) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave({
        restaurantId: restaurant.id,
        platform,
        campaignType,
        name: campaignName || undefined,
        config,
        productIds,
        startDate,
        endDate,
      });
      // onClose se llama desde CalendarPage después del success toast
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la campaña';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [platform, campaignType, campaignName, config, productIds, startDate, endDate, restaurant, onSave]);

  const resetForm = useCallback(() => {
    setCurrentStep('platform');
    setPlatform(null);
    setCampaignType(null);
    setCampaignName('');
    setConfig({});
    setProductIds([]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSubmitError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!restaurant) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 text-center">
          <p className="text-gray-500">Selecciona un restaurante para crear una campaña</p>
          <Button onClick={onClose} variant="outline" className="mt-4">
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="full">
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nueva Campaña</h2>
            <p className="text-sm text-gray-500">{restaurant.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStepIndex
                        ? 'bg-primary-600 text-white'
                        : index === currentStepIndex
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${
                      index === currentStepIndex ? 'font-medium text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-2 ${
                      index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentStep === 'platform' && (
            <PlatformSelector
              selected={platform}
              onSelect={(p) => {
                setPlatform(p);
                // Auto-advance to next step
                setTimeout(() => setCurrentStep('type'), 200);
              }}
            />
          )}

          {currentStep === 'type' && platform && (
            <CampaignTypeSelector
              platform={platform}
              selected={campaignType}
              onSelect={(type) => {
                setCampaignType(type);
                // Auto-advance to next step
                setTimeout(() => setCurrentStep('config'), 200);
              }}
            />
          )}

          {currentStep === 'config' && platform && campaignType && (
            <ConfigForm
              platform={platform}
              campaignType={campaignType}
              config={config}
              onChange={setConfig}
            />
          )}

          {currentStep === 'dates' && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              upcomingEvents={upcomingEvents}
              weatherForecasts={weatherForecasts}
            />
          )}

          {currentStep === 'review' && platform && campaignType && (
            <ReviewStep
              platform={platform}
              campaignType={campaignType}
              campaignName={campaignName}
              config={config}
              productIds={productIds}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </div>

        {/* Error message */}
        {submitError && (
          <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error al crear campaña</p>
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Atras
          </Button>

          {currentStep === 'review' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Campaña'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
