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

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EntityScopeSelector } from '@/components/common/EntityScopeSelector';
import { fetchCrpRestaurants } from '@/services/crp-portal';
import { PlatformSelector } from './PlatformSelector';
import { CampaignTypeSelector } from './CampaignTypeSelector';
import { ConfigForm } from './ConfigForm';
import { DateRangePicker } from './DateRangePicker';
import { ReviewStep } from './ReviewStep';
import { getCampaignTypeConfig } from '../../config/platforms';
import type {
  CampaignPlatform,
  CampaignConfig,
  PromotionalCampaign,
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
  /** Existing campaign for edit mode */
  campaign?: PromotionalCampaign | null;
}

type Step = 'scope' | 'platform' | 'type' | 'config' | 'dates' | 'review';

const STEPS: Step[] = ['scope', 'platform', 'type', 'config', 'dates', 'review'];

const STEP_LABELS: Record<Step, string> = {
  scope: 'Cliente',
  platform: 'Plataforma',
  type: 'Tipo',
  config: 'Configuracion',
  dates: 'Fechas',
  review: 'Revisar',
};

// Session storage key for persisting wizard state
const STORAGE_KEY = 'tphub_campaign_editor_state';

interface PersistedState {
  currentStep: Step;
  platform: CampaignPlatform | null;
  campaignType: string | null;
  campaignName: string;
  config: CampaignConfig;
  productIds: string[];
  startDate: string;
  endDate: string;
  selectedCompanyId: string | null;
  selectedBrandId: string | null;
  selectedAddressId: string | null;
  timestamp: number;
}

export function CampaignEditor({
  isOpen,
  onClose,
  onSave,
  restaurant,
  upcomingEvents = [],
  weatherForecasts = [],
  initialDate,
  campaign,
}: CampaignEditorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('scope');
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

  // Scope state (company/brand/address selection)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    restaurant?.companyId || null
  );
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    restaurant?.brandId || null
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    restaurant?.id || null
  );

  // Flag to track if we've restored from storage (to avoid overwriting)
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);

  // Load persisted state from sessionStorage on mount (only for new campaigns)
  useEffect(() => {
    if (!isOpen || campaign || hasRestoredFromStorage) return;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: PersistedState = JSON.parse(saved);
        // Only restore if saved within the last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (state.timestamp > oneHourAgo) {
          setCurrentStep(state.currentStep);
          setPlatform(state.platform);
          setCampaignType(state.campaignType);
          setCampaignName(state.campaignName);
          setConfig(state.config);
          setProductIds(state.productIds);
          setStartDate(state.startDate);
          setEndDate(state.endDate);
          setSelectedCompanyId(state.selectedCompanyId);
          setSelectedBrandId(state.selectedBrandId);
          setSelectedAddressId(state.selectedAddressId);
        } else {
          // Clear expired state
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to restore campaign editor state:', e);
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setHasRestoredFromStorage(true);
  }, [isOpen, campaign, hasRestoredFromStorage]);

  // Save state to sessionStorage whenever it changes (only when open and not editing)
  useEffect(() => {
    if (!isOpen || campaign) return;

    const state: PersistedState = {
      currentStep,
      platform,
      campaignType,
      campaignName,
      config,
      productIds,
      startDate,
      endDate,
      selectedCompanyId,
      selectedBrandId,
      selectedAddressId,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save campaign editor state:', e);
    }
  }, [
    isOpen,
    campaign,
    currentStep,
    platform,
    campaignType,
    campaignName,
    config,
    productIds,
    startDate,
    endDate,
    selectedCompanyId,
    selectedBrandId,
    selectedAddressId,
  ]);

  // Fetch restaurants to get the selected one
  const { data: restaurants = [] } = useQuery({
    queryKey: ['crp', 'restaurants', selectedCompanyId],
    queryFn: () => fetchCrpRestaurants({ companyIds: selectedCompanyId ? [selectedCompanyId] : undefined }),
    enabled: !!selectedCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  // Get the selected restaurant object
  const selectedRestaurant = useMemo(() => {
    // Handle "all addresses" case - create a virtual restaurant with id='all'
    if (selectedAddressId === 'all' && selectedCompanyId && restaurants.length > 0) {
      const firstRestaurant = restaurants[0];
      return {
        ...firstRestaurant,
        id: 'all', // Special ID for "all addresses"
        name: 'Todas las direcciones',
        companyId: selectedCompanyId,
        brandId: selectedBrandId || firstRestaurant.brandId,
      } as Restaurant;
    }

    if (selectedAddressId && selectedAddressId !== 'all') {
      return restaurants.find(r => r.id === selectedAddressId) || null;
    }
    // If no address selected but we have restaurants, create a minimal restaurant object
    // using the first restaurant's data with the selected company/brand IDs
    if (selectedCompanyId && restaurants.length > 0) {
      const firstRestaurant = restaurants[0];
      return {
        ...firstRestaurant,
        companyId: selectedCompanyId,
        brandId: selectedBrandId || firstRestaurant.brandId,
      } as Restaurant;
    }
    return null;
  }, [selectedAddressId, selectedCompanyId, selectedBrandId, restaurants]);

  // Edit mode: whether we're editing an existing campaign
  const isEditMode = !!campaign;

  // Initialize form with campaign data when editing
  useEffect(() => {
    if (campaign && isOpen) {
      setPlatform(campaign.platform);
      setCampaignType(campaign.campaignType);
      setCampaignName(campaign.name || '');
      setConfig(campaign.config);
      setProductIds(campaign.productIds);
      setStartDate(campaign.startDate);
      setEndDate(campaign.endDate);
      // Skip to config step when editing (platform, type, and scope are already set)
      setCurrentStep('config');
    }
  }, [campaign, isOpen]);

  // Initialize scope from restaurant prop when opening
  useEffect(() => {
    if (restaurant && isOpen && !campaign) {
      setSelectedCompanyId(restaurant.companyId);
      setSelectedBrandId(restaurant.brandId);
      setSelectedAddressId(restaurant.id);
    }
  }, [restaurant, isOpen, campaign]);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'platform':
        return platform !== null;
      case 'type':
        return campaignType !== null;
      case 'scope':
        // Require at least company to be selected
        return selectedCompanyId !== null;
      case 'config': {
        if (!platform || !campaignType) return false;
        const typeConfig = getCampaignTypeConfig(platform, campaignType);
        if (!typeConfig) return false;
        // Check required non-product fields
        const configFieldsValid = typeConfig.fields
          .filter(f => f.required && f.type !== 'product' && f.type !== 'products')
          .every(f => {
            const value = config[f.key as keyof CampaignConfig];
            return value !== undefined && value !== null && value !== '';
          });
        // Check required product fields
        const hasRequiredProductFields = typeConfig.fields.some(
          f => (f.type === 'product' || f.type === 'products') && f.required
        );
        const productFieldsValid = !hasRequiredProductFields || productIds.length > 0;
        return configFieldsValid && productFieldsValid;
      }
      case 'dates':
        return startDate && endDate && startDate <= endDate;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, platform, campaignType, selectedCompanyId, config, productIds, startDate, endDate]);

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
    if (!platform || !campaignType || !selectedCompanyId) return;

    // Use selected restaurant or create minimal data
    const restaurantId = selectedAddressId || selectedCompanyId;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave({
        restaurantId,
        platform,
        campaignType,
        name: campaignName || undefined,
        config,
        productIds,
        startDate,
        endDate,
      });
      // Clear persisted state on successful save
      sessionStorage.removeItem(STORAGE_KEY);
      // onClose se llama desde CalendarPage después del success toast
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la campaña';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [platform, campaignType, campaignName, config, productIds, startDate, endDate, selectedCompanyId, selectedAddressId, onSave]);

  const resetForm = useCallback(() => {
    setCurrentStep('scope');
    setPlatform(null);
    setCampaignType(null);
    setCampaignName('');
    setConfig({});
    setProductIds([]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSubmitError(null);
    // Reset scope to defaults from restaurant prop
    setSelectedCompanyId(restaurant?.companyId || null);
    setSelectedBrandId(restaurant?.brandId || null);
    setSelectedAddressId(restaurant?.id || null);
    // Clear persisted state
    sessionStorage.removeItem(STORAGE_KEY);
    setHasRestoredFromStorage(false);
  }, [restaurant]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="full">
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Editar Campaña' : 'Nueva Campaña'}
            </h2>
            {selectedRestaurant && (
              <p className="text-sm text-gray-500">{selectedRestaurant.name}</p>
            )}
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

          {currentStep === 'scope' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecciona el cliente
                </h3>
                <p className="text-sm text-gray-500">
                  Selecciona la compañía, marca y/o dirección donde se aplicará esta campaña.
                </p>
              </div>

              <EntityScopeSelector
                companyId={selectedCompanyId}
                brandId={selectedBrandId}
                addressId={selectedAddressId}
                onCompanyChange={setSelectedCompanyId}
                onBrandChange={setSelectedBrandId}
                onAddressChange={setSelectedAddressId}
                required
                summaryLabel="Campaña aplicada a"
              />
            </div>
          )}

          {currentStep === 'config' && platform && campaignType && (
            <ConfigForm
              platform={platform}
              campaignType={campaignType}
              config={config}
              onChange={setConfig}
              restaurant={selectedRestaurant}
              productIds={productIds}
              onProductIdsChange={setProductIds}
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
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Campaña'
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
