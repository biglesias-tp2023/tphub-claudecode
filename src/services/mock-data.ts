/**
 * Mock Data for Development Mode
 *
 * This file contains sample data used when VITE_DEV_AUTH_BYPASS=true
 * to allow testing the UI without a real Supabase connection.
 */

import type { Company, Brand, Area, Restaurant, RestaurantKpis } from '@/types';

// ============================================
// MOCK COMPANIES
// ============================================
export const mockCompanies: Company[] = [
  {
    id: 'company-001',
    externalId: 1,
    name: 'Restalia',
    slug: 'restalia',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'company-002',
    externalId: 2,
    name: 'Foodbox',
    slug: 'foodbox',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'company-003',
    externalId: 3,
    name: 'La Tagliatella',
    slug: 'la-tagliatella',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'company-004',
    externalId: 4,
    name: 'Goiko',
    slug: 'goiko',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'company-005',
    externalId: 5,
    name: 'Lateral',
    slug: 'lateral',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================
// MOCK BRANDS
// ============================================
export const mockBrands: Brand[] = [
  // Restalia brands
  {
    id: 'brand-001',
    allIds: ['brand-001'],
    externalId: 101,
    companyId: 'company-001',
    name: '100 Montaditos',
    slug: '100-montaditos',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'brand-002',
    allIds: ['brand-002'],
    externalId: 102,
    companyId: 'company-001',
    name: 'Cervecería La Sureña',
    slug: 'cerveceria-la-surena',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'brand-003',
    allIds: ['brand-003'],
    externalId: 103,
    companyId: 'company-001',
    name: 'The Good Burger',
    slug: 'the-good-burger',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Foodbox brands
  {
    id: 'brand-004',
    allIds: ['brand-004'],
    externalId: 201,
    companyId: 'company-002',
    name: 'Foodbox Kitchen',
    slug: 'foodbox-kitchen',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // La Tagliatella
  {
    id: 'brand-005',
    allIds: ['brand-005'],
    externalId: 301,
    companyId: 'company-003',
    name: 'La Tagliatella',
    slug: 'la-tagliatella',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Goiko
  {
    id: 'brand-006',
    allIds: ['brand-006'],
    externalId: 401,
    companyId: 'company-004',
    name: 'Goiko',
    slug: 'goiko',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Lateral
  {
    id: 'brand-007',
    allIds: ['brand-007'],
    externalId: 501,
    companyId: 'company-005',
    name: 'Lateral',
    slug: 'lateral',
    logoUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================
// MOCK AREAS
// ============================================
export const mockAreas: Area[] = [
  {
    id: 'area-001',
    externalId: 1,
    name: 'Madrid',
    country: 'ES',
    timezone: 'Europe/Madrid',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'area-002',
    externalId: 2,
    name: 'Barcelona',
    country: 'ES',
    timezone: 'Europe/Madrid',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'area-003',
    externalId: 3,
    name: 'Valencia',
    country: 'ES',
    timezone: 'Europe/Madrid',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'area-004',
    externalId: 4,
    name: 'Sevilla',
    country: 'ES',
    timezone: 'Europe/Madrid',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================
// MOCK RESTAURANTS
// ============================================
export const mockRestaurants: Restaurant[] = [
  // 100 Montaditos - Madrid
  {
    id: 'rest-001',
    allIds: ['rest-001'],
    externalId: 1001,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-001',
    name: 'Chamberí',
    address: 'Calle Fuencarral 45, Madrid',
    latitude: 40.4298,
    longitude: -3.7025,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-002',
    allIds: ['rest-002'],
    externalId: 1002,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-001',
    name: 'Opera',
    address: 'Plaza de Isabel II 5, Madrid',
    latitude: 40.4180,
    longitude: -3.7100,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-003',
    allIds: ['rest-003'],
    externalId: 1003,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-001',
    name: 'Gran Vía',
    address: 'Gran Vía 42, Madrid',
    latitude: 40.4200,
    longitude: -3.7050,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // 100 Montaditos - Barcelona
  {
    id: 'rest-004',
    allIds: ['rest-004'],
    externalId: 1004,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-002',
    name: 'Ramblas',
    address: 'La Rambla 78, Barcelona',
    latitude: 41.3818,
    longitude: 2.1685,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-004b',
    allIds: ['rest-004b'],
    externalId: 1005,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-002',
    name: 'Diagonal',
    address: 'Avinguda Diagonal 320, Barcelona',
    latitude: 41.3950,
    longitude: 2.1610,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // 100 Montaditos - Valencia
  {
    id: 'rest-004c',
    allIds: ['rest-004c'],
    externalId: 1006,
    companyId: 'company-001',
    brandId: 'brand-001',
    areaId: 'area-003',
    name: 'Colón',
    address: 'Calle Colón 25, Valencia',
    latitude: 39.4699,
    longitude: -0.3763,
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // The Good Burger - Madrid
  {
    id: 'rest-005',
    allIds: ['rest-005'],
    externalId: 2001,
    companyId: 'company-001',
    brandId: 'brand-003',
    areaId: 'area-001',
    name: 'Malasaña',
    address: 'Calle San Vicente Ferrer 30, Madrid',
    latitude: 40.4250,
    longitude: -3.7040,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // The Good Burger - Barcelona
  {
    id: 'rest-005b',
    allIds: ['rest-005b'],
    externalId: 2002,
    companyId: 'company-001',
    brandId: 'brand-003',
    areaId: 'area-002',
    name: 'Gràcia',
    address: 'Carrer Gran de Gràcia 45, Barcelona',
    latitude: 41.4020,
    longitude: 2.1560,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Goiko - Madrid
  {
    id: 'rest-006',
    allIds: ['rest-006'],
    externalId: 3001,
    companyId: 'company-004',
    brandId: 'brand-006',
    areaId: 'area-001',
    name: 'Chueca',
    address: 'Calle Hortaleza 88, Madrid',
    latitude: 40.4230,
    longitude: -3.6980,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-006b',
    allIds: ['rest-006b'],
    externalId: 3003,
    companyId: 'company-004',
    brandId: 'brand-006',
    areaId: 'area-001',
    name: 'Princesa',
    address: 'Calle Princesa 72, Madrid',
    latitude: 40.4320,
    longitude: -3.7150,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Goiko - Barcelona
  {
    id: 'rest-007',
    allIds: ['rest-007'],
    externalId: 3002,
    companyId: 'company-004',
    brandId: 'brand-006',
    areaId: 'area-002',
    name: 'Eixample',
    address: 'Passeig de Gràcia 50, Barcelona',
    latitude: 41.3940,
    longitude: 2.1630,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-007b',
    allIds: ['rest-007b'],
    externalId: 3004,
    companyId: 'company-004',
    brandId: 'brand-006',
    areaId: 'area-002',
    name: 'Born',
    address: 'Passeig del Born 15, Barcelona',
    latitude: 41.3850,
    longitude: 2.1830,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // La Tagliatella - Madrid
  {
    id: 'rest-008',
    allIds: ['rest-008'],
    externalId: 4001,
    companyId: 'company-003',
    brandId: 'brand-005',
    areaId: 'area-001',
    name: 'Salamanca',
    address: 'Calle Serrano 100, Madrid',
    latitude: 40.4350,
    longitude: -3.6850,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-008b',
    allIds: ['rest-008b'],
    externalId: 4002,
    companyId: 'company-003',
    brandId: 'brand-005',
    areaId: 'area-001',
    name: 'La Moraleja',
    address: 'Av. de Europa 19, Alcobendas',
    latitude: 40.5100,
    longitude: -3.6420,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // La Tagliatella - Barcelona
  {
    id: 'rest-008c',
    allIds: ['rest-008c'],
    externalId: 4003,
    companyId: 'company-003',
    brandId: 'brand-005',
    areaId: 'area-002',
    name: 'Pedralbes',
    address: 'Av. Diagonal 609, Barcelona',
    latitude: 41.3890,
    longitude: 2.1250,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-008d',
    allIds: ['rest-008d'],
    externalId: 4004,
    companyId: 'company-003',
    brandId: 'brand-005',
    areaId: 'area-002',
    name: 'Maremagnum',
    address: 'Moll d\'Espanya 5, Barcelona',
    latitude: 41.3760,
    longitude: 2.1840,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // La Tagliatella - Valencia
  {
    id: 'rest-008e',
    allIds: ['rest-008e'],
    externalId: 4005,
    companyId: 'company-003',
    brandId: 'brand-005',
    areaId: 'area-003',
    name: 'Aqua',
    address: 'Av. de Francia 3, Valencia',
    latitude: 39.4580,
    longitude: -0.3520,
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Lateral - Madrid
  {
    id: 'rest-009',
    allIds: ['rest-009'],
    externalId: 5001,
    companyId: 'company-005',
    brandId: 'brand-007',
    areaId: 'area-001',
    name: 'Castellana',
    address: 'Paseo de la Castellana 42, Madrid',
    latitude: 40.4380,
    longitude: -3.6920,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-009b',
    allIds: ['rest-009b'],
    externalId: 5002,
    companyId: 'company-005',
    brandId: 'brand-007',
    areaId: 'area-001',
    name: 'Arturo Soria',
    address: 'Calle Arturo Soria 126, Madrid',
    latitude: 40.4550,
    longitude: -3.6380,
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Foodbox - Madrid
  {
    id: 'rest-010',
    allIds: ['rest-010'],
    externalId: 6001,
    companyId: 'company-002',
    brandId: 'brand-004',
    areaId: 'area-001',
    name: 'Pozuelo',
    address: 'Av. de Europa 10, Pozuelo',
    latitude: 40.4350,
    longitude: -3.8150,
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Foodbox - Barcelona
  {
    id: 'rest-010b',
    allIds: ['rest-010b'],
    externalId: 6002,
    companyId: 'company-002',
    brandId: 'brand-004',
    areaId: 'area-002',
    name: 'Sant Cugat',
    address: 'Av. de Rius i Taulet 5, Sant Cugat',
    latitude: 41.4720,
    longitude: 2.0860,
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================
// MOCK RESTAURANT KPIs
// ============================================
function generateMockKpis(): RestaurantKpis[] {
  const kpis: RestaurantKpis[] = [];
  const restaurants = mockRestaurants;

  // Generate monthly KPIs for the last 6 months
  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo++) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(1);
    const periodDate = date.toISOString().split('T')[0];

    for (const restaurant of restaurants) {
      const baseOrders = Math.floor(Math.random() * 500) + 200;
      const baseRevenue = baseOrders * (Math.random() * 8 + 12); // Avg ticket €12-20

      kpis.push({
        id: `kpi-${restaurant.id}-${periodDate}`,
        restaurantId: restaurant.id,
        periodDate,
        periodType: 'monthly',
        totalOrders: baseOrders,
        totalRevenue: Math.round(baseRevenue * 100) / 100,
        avgTicket: Math.round((baseRevenue / baseOrders) * 100) / 100,
        avgDeliveryTimeMin: Math.floor(Math.random() * 15) + 25,
        avgRating: Math.round((Math.random() * 1 + 4) * 100) / 100, // 4.0-5.0
        newCustomers: Math.floor(baseOrders * (Math.random() * 0.2 + 0.1)),
        newCustomerPct: Math.round(Math.random() * 20 + 10),
        ordersGlovo: Math.floor(baseOrders * 0.4),
        ordersUbereats: Math.floor(baseOrders * 0.35),
        ordersJusteat: Math.floor(baseOrders * 0.25),
        revenueGlovo: Math.round(baseRevenue * 0.4 * 100) / 100,
        revenueUbereats: Math.round(baseRevenue * 0.35 * 100) / 100,
        revenueJusteat: Math.round(baseRevenue * 0.25 * 100) / 100,
        incidenceCount: Math.floor(Math.random() * 20),
        incidenceRate: Math.round(Math.random() * 5 * 100) / 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return kpis;
}

export const mockKpis = generateMockKpis();

// ============================================
// MOCK STRATEGIC OBJECTIVES (localStorage persistence)
// ============================================
import type { StrategicObjective, StrategicTask } from '@/types';

const OBJECTIVES_STORAGE_KEY = 'tphub_mock_objectives';
const TASKS_STORAGE_KEY = 'tphub_mock_tasks';
const OBJECTIVE_COUNTER_KEY = 'tphub_mock_obj_counter';
const TASK_COUNTER_KEY = 'tphub_mock_task_counter';

// Load from localStorage or initialize empty
// Adds default values for new fields (migration for existing data)
function loadMockObjectives(): StrategicObjective[] {
  try {
    const stored = localStorage.getItem(OBJECTIVES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StrategicObjective[];
      // Add default values for new fields if missing (migration)
      return parsed.map((obj) => ({
        ...obj,
        baselineValue: obj.baselineValue ?? null,
        baselineDate: obj.baselineDate ?? obj.createdAt?.split('T')[0] ?? null,
        targetDirection: obj.targetDirection ?? 'increase',
        priority: obj.priority ?? 'medium',
        isArchived: obj.isArchived ?? false,
      }));
    }
  } catch {
    console.warn('Failed to load mock objectives from localStorage');
  }
  return [];
}

function loadMockTasks(): StrategicTask[] {
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load mock tasks from localStorage');
  }
  return [];
}

function loadCounter(key: string, defaultVal: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch {
    console.warn(`Failed to load counter ${key}`);
  }
  return defaultVal;
}

function saveObjectives(objectives: StrategicObjective[]): void {
  try {
    localStorage.setItem(OBJECTIVES_STORAGE_KEY, JSON.stringify(objectives));
  } catch {
    console.warn('Failed to save mock objectives to localStorage');
  }
}

function saveTasks(tasks: StrategicTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.warn('Failed to save mock tasks to localStorage');
  }
}

function saveCounter(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    console.warn(`Failed to save counter ${key}`);
  }
}

// Initialize from localStorage
export const mockStrategicObjectives: StrategicObjective[] = loadMockObjectives();
export const mockStrategicTasks: StrategicTask[] = loadMockTasks();

let mockObjectiveIdCounter = loadCounter(OBJECTIVE_COUNTER_KEY, 1);

export function addMockStrategicObjective(objective: Omit<StrategicObjective, 'id' | 'createdAt' | 'updatedAt'>): StrategicObjective {
  const newObjective: StrategicObjective = {
    ...objective,
    id: `strategic-obj-${mockObjectiveIdCounter++}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockStrategicObjectives.push(newObjective);
  saveObjectives(mockStrategicObjectives);
  saveCounter(OBJECTIVE_COUNTER_KEY, mockObjectiveIdCounter);
  return newObjective;
}

export function updateMockStrategicObjective(id: string, updates: Partial<StrategicObjective>): StrategicObjective | null {
  const index = mockStrategicObjectives.findIndex((o) => o.id === id);
  if (index === -1) return null;

  mockStrategicObjectives[index] = {
    ...mockStrategicObjectives[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveObjectives(mockStrategicObjectives);
  return mockStrategicObjectives[index];
}

export function deleteMockStrategicObjective(id: string): boolean {
  const index = mockStrategicObjectives.findIndex((o) => o.id === id);
  if (index === -1) return false;
  mockStrategicObjectives.splice(index, 1);
  saveObjectives(mockStrategicObjectives);
  return true;
}

// ============================================
// MOCK STRATEGIC TASKS HELPERS
// ============================================

let mockTaskIdCounter = loadCounter(TASK_COUNTER_KEY, 1);

export function addMockStrategicTask(task: Omit<StrategicTask, 'id' | 'createdAt' | 'updatedAt'>): StrategicTask {
  const newTask: StrategicTask = {
    ...task,
    id: `strategic-task-${mockTaskIdCounter++}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockStrategicTasks.push(newTask);
  saveTasks(mockStrategicTasks);
  saveCounter(TASK_COUNTER_KEY, mockTaskIdCounter);
  return newTask;
}

export function updateMockStrategicTask(id: string, updates: Partial<StrategicTask>): StrategicTask | null {
  const index = mockStrategicTasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // Handle completion status
  if (updates.isCompleted !== undefined) {
    updates.completedAt = updates.isCompleted ? new Date().toISOString() : null;
  }

  mockStrategicTasks[index] = {
    ...mockStrategicTasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTasks(mockStrategicTasks);
  return mockStrategicTasks[index];
}

export function deleteMockStrategicTask(id: string): boolean {
  const index = mockStrategicTasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  mockStrategicTasks.splice(index, 1);
  saveTasks(mockStrategicTasks);
  return true;
}


// ============================================
// CHECK IF DEV MODE
// ============================================
export const isDevMode = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
