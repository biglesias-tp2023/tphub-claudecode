import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDashboardFiltersStore, useGlobalFiltersStore } from '@/stores/filtersStore';
import type { ChannelId, DatePreset } from '@/types';
import { useOrdersData } from './useOrdersData';

// ============================================
// DATE PERIOD HELPERS
// ============================================

/**
 * Get the number of days for a date preset
 */
function getDaysFromPreset(preset: DatePreset): number {
  switch (preset) {
    case 'today':
      return 1;
    case 'yesterday':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case 'year':
      return 365;
    case 'custom':
    default:
      return 30;
  }
}

/**
 * Get a scaling factor based on the date range
 * Base is 30 days, so 7 days = 7/30, 90 days = 90/30, etc.
 */
function getScalingFactor(preset: DatePreset): number {
  const days = getDaysFromPreset(preset);
  return days / 30;
}

/**
 * Generate a seed for consistent random values based on period
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// ============================================
// TYPES
// ============================================

export interface PortfolioMetrics {
  ventas: number;
  ventasChange: number;
  pedidos: number;
  pedidosChange: number;
  ticketMedio: number;
  ticketMedioChange: number;
  openTime: number;
  openTimeChange: number;
  inversionAds: number;
  inversionAdsChange: number;
  adsPercentage: number;
  inversionPromos: number;
  inversionPromosChange: number;
  promosPercentage: number;
  reembolsos: number;
  reembolsosChange: number;
  reembolsosPercentage: number;
  // New metrics from CRP Portal
  /** Net revenue after refunds (ventas - reembolsos) */
  netRevenue: number;
  netRevenueChange: number;
  /** Unique customer count */
  uniqueCustomers: number;
  uniqueCustomersChange: number;
  /** Average orders per customer */
  ordersPerCustomer: number;
  ordersPerCustomerChange: number;
  /** Average discount per order */
  avgDiscountPerOrder: number;
}

export interface ChannelMetrics {
  channel: ChannelId;
  name: string;
  color: string;
  logo: string;
  revenue: number;
  revenueChange: number;
  percentage: number;
  pedidos: number;
  pedidosPercentage: number;
  ticketMedio: number;
  openTime: number;
  ads: number;
  adsPercentage: number;
  promos: number;
  promosPercentage: number;
  reembolsos: number;
  reembolsosPercentage: number;
  // New metrics from CRP Portal
  /** Net revenue after refunds */
  netRevenue: number;
  /** Unique customer count per channel */
  uniqueCustomers: number;
}

export interface HierarchyRow {
  id: string;
  level: 'company' | 'brand' | 'area' | 'address' | 'channel';
  name: string;
  subtitle?: string;
  parentId?: string;
  channelId?: ChannelId;
  companyId?: string; // Para filtrar por compañía

  // Rendimiento
  ventas: number;
  ventasChange: number;
  pedidos: number;
  ticketMedio: number;
  nuevosClientes: number;
  porcentajeNuevos: number;
  openTime: number;
  ratioConversion: number;

  // Operaciones
  tiempoEspera: string;
  valoraciones: number;

  // Publicidad
  inversionAds: number;
  adsPercentage: number;
  roas: number;

  // Promociones
  inversionPromos: number;
  promosPercentage: number;
  promosRoas: number;

  // Reembolsos
  reembolsos: number;
  reembolsosPercentage: number;
}

export interface ControllingData {
  portfolio: PortfolioMetrics;
  channels: ChannelMetrics[];
  hierarchy: HierarchyRow[];
}

// ============================================
// DEMO DATA - COMPANIES WITH FULL HIERARCHY
// ============================================

interface CompanyData {
  id: string;
  name: string;
  brands: BrandData[];
}

interface BrandData {
  id: string;
  name: string;
  areas: AreaData[];
}

interface AreaData {
  id: string;
  name: string;
  addresses: AddressData[];
}

interface AddressData {
  id: string;
  name: string;
  channels: ChannelData[];
}

interface ChannelData {
  channel: ChannelId;
  ventas: number;
  pedidos: number;
}

// Demo data with FULL hierarchy for all companies
const DEMO_COMPANIES: CompanyData[] = [
  {
    id: 'vicio',
    name: 'VICIO',
    brands: [
      {
        id: 'vicio-brand',
        name: 'VICIO',
        areas: [
          {
            id: 'vicio-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'vicio-madrid-centro',
                name: 'Gran Vía 42',
                channels: [
                  { channel: 'glovo', ventas: 5204.24, pedidos: 217 },
                  { channel: 'ubereats', ventas: 7965.32, pedidos: 332 },
                  { channel: 'justeat', ventas: 2100.00, pedidos: 88 },
                ],
              },
              {
                id: 'vicio-madrid-chamberi',
                name: 'Chamberí',
                channels: [
                  { channel: 'glovo', ventas: 3000.00, pedidos: 125 },
                  { channel: 'ubereats', ventas: 5000.00, pedidos: 208 },
                  { channel: 'justeat', ventas: 1850.00, pedidos: 77 },
                ],
              },
              {
                id: 'vicio-madrid-salamanca',
                name: 'Salamanca',
                channels: [
                  { channel: 'glovo', ventas: 4200.00, pedidos: 175 },
                  { channel: 'ubereats', ventas: 6100.00, pedidos: 254 },
                ],
              },
            ],
          },
          {
            id: 'vicio-barcelona',
            name: 'Barcelona',
            addresses: [
              {
                id: 'vicio-barcelona-eixample',
                name: 'Eixample',
                channels: [
                  { channel: 'glovo', ventas: 3500.00, pedidos: 146 },
                  { channel: 'ubereats', ventas: 4292.45, pedidos: 179 },
                  { channel: 'justeat', ventas: 1900.00, pedidos: 79 },
                ],
              },
              {
                id: 'vicio-barcelona-gracia',
                name: 'Gràcia',
                channels: [
                  { channel: 'glovo', ventas: 2800.00, pedidos: 117 },
                  { channel: 'ubereats', ventas: 3650.00, pedidos: 152 },
                ],
              },
            ],
          },
          {
            id: 'vicio-valencia',
            name: 'Valencia',
            addresses: [
              {
                id: 'vicio-valencia-centro',
                name: 'El Carmen',
                channels: [
                  { channel: 'glovo', ventas: 2100.00, pedidos: 88 },
                  { channel: 'ubereats', ventas: 3200.00, pedidos: 133 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'goiko',
    name: 'Goiko',
    brands: [
      {
        id: 'goiko-grill',
        name: 'Goiko Grill',
        areas: [
          {
            id: 'goiko-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'goiko-madrid-sol',
                name: 'Sol',
                channels: [
                  { channel: 'glovo', ventas: 4500.00, pedidos: 180 },
                  { channel: 'ubereats', ventas: 6200.00, pedidos: 248 },
                  { channel: 'justeat', ventas: 2100.00, pedidos: 84 },
                ],
              },
              {
                id: 'goiko-madrid-chamberi',
                name: 'Chamberí',
                channels: [
                  { channel: 'glovo', ventas: 3800.00, pedidos: 152 },
                  { channel: 'ubereats', ventas: 4538.25, pedidos: 182 },
                  { channel: 'justeat', ventas: 1650.00, pedidos: 66 },
                ],
              },
              {
                id: 'goiko-madrid-moncloa',
                name: 'Moncloa',
                channels: [
                  { channel: 'glovo', ventas: 2900.00, pedidos: 116 },
                  { channel: 'ubereats', ventas: 3750.00, pedidos: 150 },
                ],
              },
              {
                id: 'goiko-madrid-retiro',
                name: 'Retiro',
                channels: [
                  { channel: 'glovo', ventas: 3200.00, pedidos: 128 },
                  { channel: 'ubereats', ventas: 4100.00, pedidos: 164 },
                  { channel: 'justeat', ventas: 1400.00, pedidos: 56 },
                ],
              },
              {
                id: 'goiko-madrid-lavapies',
                name: 'Lavapiés',
                channels: [
                  { channel: 'glovo', ventas: 2650.00, pedidos: 106 },
                  { channel: 'ubereats', ventas: 3400.00, pedidos: 136 },
                ],
              },
            ],
          },
          {
            id: 'goiko-barcelona',
            name: 'Barcelona',
            addresses: [
              {
                id: 'goiko-barcelona-born',
                name: 'El Born',
                channels: [
                  { channel: 'glovo', ventas: 3600.00, pedidos: 144 },
                  { channel: 'ubereats', ventas: 4800.00, pedidos: 192 },
                  { channel: 'justeat', ventas: 1800.00, pedidos: 72 },
                ],
              },
              {
                id: 'goiko-barcelona-diagonal',
                name: 'Diagonal',
                channels: [
                  { channel: 'glovo', ventas: 4100.00, pedidos: 164 },
                  { channel: 'ubereats', ventas: 5200.00, pedidos: 208 },
                ],
              },
              {
                id: 'goiko-barcelona-gracia',
                name: 'Gràcia',
                channels: [
                  { channel: 'glovo', ventas: 2800.00, pedidos: 112 },
                  { channel: 'ubereats', ventas: 3500.00, pedidos: 140 },
                  { channel: 'justeat', ventas: 1200.00, pedidos: 48 },
                ],
              },
            ],
          },
          {
            id: 'goiko-valencia',
            name: 'Valencia',
            addresses: [
              {
                id: 'goiko-valencia-ruzafa',
                name: 'Ruzafa',
                channels: [
                  { channel: 'glovo', ventas: 2500.00, pedidos: 100 },
                  { channel: 'ubereats', ventas: 3200.00, pedidos: 128 },
                  { channel: 'justeat', ventas: 1100.00, pedidos: 44 },
                ],
              },
              {
                id: 'goiko-valencia-centro',
                name: 'Centro',
                channels: [
                  { channel: 'glovo', ventas: 2800.00, pedidos: 112 },
                  { channel: 'ubereats', ventas: 3600.00, pedidos: 144 },
                ],
              },
            ],
          },
          {
            id: 'goiko-sevilla',
            name: 'Sevilla',
            addresses: [
              {
                id: 'goiko-sevilla-triana',
                name: 'Triana',
                channels: [
                  { channel: 'glovo', ventas: 2200.00, pedidos: 88 },
                  { channel: 'ubereats', ventas: 2900.00, pedidos: 116 },
                ],
              },
              {
                id: 'goiko-sevilla-nervion',
                name: 'Nervión',
                channels: [
                  { channel: 'glovo', ventas: 1900.00, pedidos: 76 },
                  { channel: 'ubereats', ventas: 2500.00, pedidos: 100 },
                  { channel: 'justeat', ventas: 950.00, pedidos: 38 },
                ],
              },
            ],
          },
          {
            id: 'goiko-malaga',
            name: 'Málaga',
            addresses: [
              {
                id: 'goiko-malaga-centro',
                name: 'Centro Histórico',
                channels: [
                  { channel: 'glovo', ventas: 2100.00, pedidos: 84 },
                  { channel: 'ubereats', ventas: 2700.00, pedidos: 108 },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'goiko-kevin-bacon',
        name: 'Kevin Bacon',
        areas: [
          {
            id: 'kevin-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'kevin-madrid-malasana',
                name: 'Malasaña',
                channels: [
                  { channel: 'glovo', ventas: 1800.00, pedidos: 90 },
                  { channel: 'ubereats', ventas: 2400.00, pedidos: 120 },
                ],
              },
            ],
          },
          {
            id: 'kevin-barcelona',
            name: 'Barcelona',
            addresses: [
              {
                id: 'kevin-barcelona-raval',
                name: 'El Raval',
                channels: [
                  { channel: 'glovo', ventas: 1500.00, pedidos: 75 },
                  { channel: 'ubereats', ventas: 2000.00, pedidos: 100 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tagliatella',
    name: 'La Tagliatella',
    brands: [
      {
        id: 'tagliatella-brand',
        name: 'La Tagliatella',
        areas: [
          {
            id: 'tagliatella-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'tagliatella-madrid-princesa',
                name: 'Princesa',
                channels: [
                  { channel: 'glovo', ventas: 3200.00, pedidos: 128 },
                  { channel: 'ubereats', ventas: 4100.00, pedidos: 164 },
                  { channel: 'justeat', ventas: 1800.00, pedidos: 72 },
                ],
              },
              {
                id: 'tagliatella-madrid-xanadu',
                name: 'Xanadú',
                channels: [
                  { channel: 'glovo', ventas: 2800.00, pedidos: 112 },
                  { channel: 'ubereats', ventas: 3500.00, pedidos: 140 },
                ],
              },
            ],
          },
          {
            id: 'tagliatella-valencia',
            name: 'Valencia',
            addresses: [
              {
                id: 'tagliatella-valencia-centro',
                name: 'Centro',
                channels: [
                  { channel: 'glovo', ventas: 4745.80, pedidos: 190 },
                  { channel: 'ubereats', ventas: 5965.32, pedidos: 239 },
                  { channel: 'justeat', ventas: 3523.15, pedidos: 141 },
                ],
              },
              {
                id: 'tagliatella-valencia-aqua',
                name: 'Aqua',
                channels: [
                  { channel: 'glovo', ventas: 2900.00, pedidos: 116 },
                  { channel: 'ubereats', ventas: 3700.00, pedidos: 148 },
                ],
              },
            ],
          },
          {
            id: 'tagliatella-barcelona',
            name: 'Barcelona',
            addresses: [
              {
                id: 'tagliatella-barcelona-maremagnum',
                name: 'Maremagnum',
                channels: [
                  { channel: 'glovo', ventas: 3100.00, pedidos: 124 },
                  { channel: 'ubereats', ventas: 4000.00, pedidos: 160 },
                  { channel: 'justeat', ventas: 1600.00, pedidos: 64 },
                ],
              },
            ],
          },
          {
            id: 'tagliatella-zaragoza',
            name: 'Zaragoza',
            addresses: [
              {
                id: 'tagliatella-zaragoza-centro',
                name: 'Plaza España',
                channels: [
                  { channel: 'glovo', ventas: 2200.00, pedidos: 88 },
                  { channel: 'ubereats', ventas: 2800.00, pedidos: 112 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'telepizza',
    name: 'Telepizza',
    brands: [
      {
        id: 'telepizza-brand',
        name: 'Telepizza',
        areas: [
          {
            id: 'telepizza-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'telepizza-madrid-vallecas',
                name: 'Vallecas',
                channels: [
                  { channel: 'glovo', ventas: 1800.00, pedidos: 90 },
                  { channel: 'ubereats', ventas: 2200.00, pedidos: 110 },
                  { channel: 'justeat', ventas: 3500.00, pedidos: 175 },
                ],
              },
              {
                id: 'telepizza-madrid-getafe',
                name: 'Getafe',
                channels: [
                  { channel: 'glovo', ventas: 1600.00, pedidos: 80 },
                  { channel: 'ubereats', ventas: 1900.00, pedidos: 95 },
                  { channel: 'justeat', ventas: 3200.00, pedidos: 160 },
                ],
              },
              {
                id: 'telepizza-madrid-alcorcon',
                name: 'Alcorcón',
                channels: [
                  { channel: 'glovo', ventas: 1400.00, pedidos: 70 },
                  { channel: 'justeat', ventas: 2800.00, pedidos: 140 },
                ],
              },
            ],
          },
          {
            id: 'telepizza-sevilla',
            name: 'Sevilla',
            addresses: [
              {
                id: 'telepizza-sevilla-triana',
                name: 'Triana',
                channels: [
                  { channel: 'glovo', ventas: 3200.00, pedidos: 128 },
                  { channel: 'ubereats', ventas: 4500.00, pedidos: 180 },
                  { channel: 'justeat', ventas: 2346.45, pedidos: 94 },
                ],
              },
              {
                id: 'telepizza-sevilla-este',
                name: 'Sevilla Este',
                channels: [
                  { channel: 'glovo', ventas: 1500.00, pedidos: 75 },
                  { channel: 'justeat', ventas: 2100.00, pedidos: 105 },
                ],
              },
            ],
          },
          {
            id: 'telepizza-bilbao',
            name: 'Bilbao',
            addresses: [
              {
                id: 'telepizza-bilbao-deusto',
                name: 'Deusto',
                channels: [
                  { channel: 'glovo', ventas: 1200.00, pedidos: 60 },
                  { channel: 'ubereats', ventas: 1600.00, pedidos: 80 },
                  { channel: 'justeat', ventas: 2400.00, pedidos: 120 },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'telepizza-jenos',
        name: "Jeno's Pizza",
        areas: [
          {
            id: 'jenos-madrid',
            name: 'Madrid',
            addresses: [
              {
                id: 'jenos-madrid-centro',
                name: 'Centro',
                channels: [
                  { channel: 'glovo', ventas: 900.00, pedidos: 45 },
                  { channel: 'ubereats', ventas: 1200.00, pedidos: 60 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

interface CreateRowOptions {
  id: string;
  level: HierarchyRow['level'];
  name: string;
  baseVentas: number;
  basePedidos: number;
  scalingFactor: number;
  comparisonVariation: number; // Variation from previous period (-0.2 to 0.3 typical)
  parentId?: string;
  channelId?: ChannelId;
  companyId?: string;
  subtitle?: string;
  randomSeed: number;
}

function createRow(options: CreateRowOptions): HierarchyRow {
  const {
    id,
    level,
    name,
    baseVentas,
    basePedidos,
    scalingFactor,
    comparisonVariation,
    parentId,
    channelId,
    companyId,
    subtitle,
    randomSeed,
  } = options;

  // Generate consistent random values based on seed
  const random = seededRandom(randomSeed);

  // Scale values by the date range factor
  const ventas = baseVentas * scalingFactor;
  const pedidos = Math.round(basePedidos * scalingFactor);

  // Calculate previous period values (for comparison)
  // Previous period had different performance - use the comparison variation
  const ventasPrevious = ventas / (1 + comparisonVariation);
  const pedidosPrevious = pedidos / (1 + comparisonVariation * 0.8); // Pedidos vary less

  // Calculate percentage changes
  const ventasChange = ((ventas - ventasPrevious) / ventasPrevious) * 100;
  // Note: pedidosChange and ticketMedioChange are calculated for reference but currently unused
  // as the hierarchy rows focus on ventas changes
  void pedidosPrevious; // Acknowledge usage for comparison calculation

  const ticketMedio = pedidos > 0 ? ventas / pedidos : 0;

  const nuevosClientes = Math.round(pedidos * 0.26);

  // Generate other metrics with seeded randomness
  const adsRate = 0.12 + random() * 0.06;
  const promosRate = 0.08 + random() * 0.05;
  const reembolsosRate = 0.015 + random() * 0.01;

  const inversionAds = ventas * adsRate;
  const inversionPromos = ventas * promosRate;
  const reembolsos = ventas * reembolsosRate;

  // Previous period costs (slightly different rates)
  const inversionAdsPrevious = ventasPrevious * (adsRate * (0.9 + random() * 0.2));
  const inversionPromosPrevious = ventasPrevious * (promosRate * (0.9 + random() * 0.2));
  const reembolsosPrevious = ventasPrevious * (reembolsosRate * (0.9 + random() * 0.2));

  const adsChange = inversionAdsPrevious > 0
    ? ((inversionAds - inversionAdsPrevious) / inversionAdsPrevious) * 100
    : 0;
  const promosChange = inversionPromosPrevious > 0
    ? ((inversionPromos - inversionPromosPrevious) / inversionPromosPrevious) * 100
    : 0;
  const reembolsosChange = reembolsosPrevious > 0
    ? ((reembolsos - reembolsosPrevious) / reembolsosPrevious) * 100
    : 0;

  const openTime = 75 + random() * 20;
  const openTimePrevious = 70 + random() * 20;
  const openTimeChange = ((openTime - openTimePrevious) / openTimePrevious) * 100;

  return {
    id,
    level,
    name,
    subtitle,
    parentId,
    channelId,
    companyId,
    ventas,
    ventasChange,
    pedidos,
    ticketMedio,
    nuevosClientes,
    porcentajeNuevos: 24 + random() * 4,
    openTime,
    ratioConversion: 6 + random() * 6,
    tiempoEspera: `${Math.round(4 + random() * 8)}m`,
    valoraciones: 4.2 + random() * 0.7,
    inversionAds,
    adsPercentage: ventas > 0 ? (inversionAds / ventas) * 100 : 0,
    roas: 4 + random() * 6,
    inversionPromos,
    promosPercentage: ventas > 0 ? (inversionPromos / ventas) * 100 : 0,
    promosRoas: 3 + random() * 5,
    reembolsos,
    reembolsosPercentage: ventas > 0 ? (reembolsos / ventas) * 100 : 0,
    // Store change values for later use
    _adsChange: adsChange,
    _promosChange: promosChange,
    _reembolsosChange: reembolsosChange,
    _openTimeChange: openTimeChange,
  } as HierarchyRow;
}

function generateHierarchy(preset: DatePreset): HierarchyRow[] {
  const rows: HierarchyRow[] = [];
  const scalingFactor = getScalingFactor(preset);

  // Generate a base seed from the preset for consistent but different data per period
  const presetSeed = preset.charCodeAt(0) * 1000;
  let rowIndex = 0;

  DEMO_COMPANIES.forEach((company, companyIdx) => {
    // Calculate company totals from nested data
    let companyVentas = 0;
    let companyPedidos = 0;

    company.brands.forEach((brand) => {
      brand.areas.forEach((area) => {
        area.addresses.forEach((address) => {
          address.channels.forEach((ch) => {
            companyVentas += ch.ventas;
            companyPedidos += ch.pedidos;
          });
        });
      });
    });

    // Generate comparison variation for this company (-10% to +15%)
    const companyVariation = -0.10 + (companyIdx * 0.08);

    // Company level
    rows.push(createRow({
      id: company.id,
      level: 'company',
      name: company.name,
      baseVentas: companyVentas,
      basePedidos: companyPedidos,
      scalingFactor,
      comparisonVariation: companyVariation,
      companyId: company.id,
      randomSeed: presetSeed + rowIndex++,
    }));

    // Brands
    company.brands.forEach((brand, brandIdx) => {
      let brandVentas = 0;
      let brandPedidos = 0;

      brand.areas.forEach((area) => {
        area.addresses.forEach((address) => {
          address.channels.forEach((ch) => {
            brandVentas += ch.ventas;
            brandPedidos += ch.pedidos;
          });
        });
      });

      const brandVariation = -0.08 + (brandIdx * 0.06);

      rows.push(createRow({
        id: brand.id,
        level: 'brand',
        name: brand.name,
        baseVentas: brandVentas,
        basePedidos: brandPedidos,
        scalingFactor,
        comparisonVariation: brandVariation,
        parentId: company.id,
        companyId: company.id,
        randomSeed: presetSeed + rowIndex++,
      }));

      // Areas
      brand.areas.forEach((area, areaIdx) => {
        let areaVentas = 0;
        let areaPedidos = 0;

        area.addresses.forEach((address) => {
          address.channels.forEach((ch) => {
            areaVentas += ch.ventas;
            areaPedidos += ch.pedidos;
          });
        });

        const areaVariation = -0.05 + (areaIdx * 0.04);

        rows.push(createRow({
          id: area.id,
          level: 'area',
          name: area.name,
          baseVentas: areaVentas,
          basePedidos: areaPedidos,
          scalingFactor,
          comparisonVariation: areaVariation,
          parentId: brand.id,
          companyId: company.id,
          randomSeed: presetSeed + rowIndex++,
        }));

        // Addresses
        area.addresses.forEach((address, addressIdx) => {
          let addressVentas = 0;
          let addressPedidos = 0;

          address.channels.forEach((ch) => {
            addressVentas += ch.ventas;
            addressPedidos += ch.pedidos;
          });

          const addressVariation = -0.12 + (addressIdx * 0.08);

          rows.push(createRow({
            id: address.id,
            level: 'address',
            name: address.name,
            baseVentas: addressVentas,
            basePedidos: addressPedidos,
            scalingFactor,
            comparisonVariation: addressVariation,
            parentId: area.id,
            companyId: company.id,
            randomSeed: presetSeed + rowIndex++,
          }));

          // Channels
          address.channels.forEach((ch, chIdx) => {
            const channelName = ch.channel === 'glovo' ? 'Glovo' : ch.channel === 'ubereats' ? 'Uber Eats' : 'Just Eat';
            const channelVariation = ch.channel === 'ubereats' ? 0.07 : ch.channel === 'glovo' ? 0.10 : 0.14;

            rows.push(createRow({
              id: `${address.id}-${ch.channel}`,
              level: 'channel',
              name: channelName,
              baseVentas: ch.ventas,
              basePedidos: ch.pedidos,
              scalingFactor,
              comparisonVariation: channelVariation + (chIdx * 0.02),
              parentId: address.id,
              channelId: ch.channel,
              companyId: company.id,
              randomSeed: presetSeed + rowIndex++,
            }));
          });
        });
      });
    });
  });

  return rows;
}

function calculatePortfolioFromHierarchy(hierarchy: HierarchyRow[], companyFilter?: string[]): PortfolioMetrics {
  // Filter to only company-level rows
  let companyRows = hierarchy.filter((r) => r.level === 'company');

  if (companyFilter && companyFilter.length > 0) {
    companyRows = companyRows.filter((r) => companyFilter.includes(r.id));
  }

  // Calculate totals and weighted averages for change percentages
  const totals = companyRows.reduce(
    (acc, row) => {
      const rowData = row as HierarchyRow & { _adsChange?: number; _promosChange?: number; _reembolsosChange?: number; _openTimeChange?: number };
      return {
        ventas: acc.ventas + row.ventas,
        pedidos: acc.pedidos + row.pedidos,
        inversionAds: acc.inversionAds + row.inversionAds,
        inversionPromos: acc.inversionPromos + row.inversionPromos,
        reembolsos: acc.reembolsos + row.reembolsos,
        openTimeSum: acc.openTimeSum + row.openTime,
        // Weighted sum for change calculations
        ventasChangeWeighted: acc.ventasChangeWeighted + (row.ventasChange * row.ventas),
        adsChangeWeighted: acc.adsChangeWeighted + ((rowData._adsChange || 0) * row.inversionAds),
        promosChangeWeighted: acc.promosChangeWeighted + ((rowData._promosChange || 0) * row.inversionPromos),
        reembolsosChangeWeighted: acc.reembolsosChangeWeighted + ((rowData._reembolsosChange || 0) * row.reembolsos),
        openTimeChangeWeighted: acc.openTimeChangeWeighted + ((rowData._openTimeChange || 0) * row.ventas),
        count: acc.count + 1,
      };
    },
    {
      ventas: 0, pedidos: 0, inversionAds: 0, inversionPromos: 0, reembolsos: 0, openTimeSum: 0,
      ventasChangeWeighted: 0, adsChangeWeighted: 0, promosChangeWeighted: 0, reembolsosChangeWeighted: 0, openTimeChangeWeighted: 0,
      count: 0,
    }
  );

  const avgOpenTime = totals.count > 0 ? totals.openTimeSum / totals.count : 0;

  // Calculate weighted average changes
  const ventasChange = totals.ventas > 0 ? totals.ventasChangeWeighted / totals.ventas : 0;
  const pedidosChange = ventasChange * 0.8; // Pedidos typically change less
  const ticketMedioChange = ventasChange - pedidosChange;
  const adsChange = totals.inversionAds > 0 ? totals.adsChangeWeighted / totals.inversionAds : 0;
  const promosChange = totals.inversionPromos > 0 ? totals.promosChangeWeighted / totals.inversionPromos : 0;
  const reembolsosChange = totals.reembolsos > 0 ? totals.reembolsosChangeWeighted / totals.reembolsos : 0;
  const openTimeChange = totals.ventas > 0 ? totals.openTimeChangeWeighted / totals.ventas : 0;

  return {
    ventas: totals.ventas,
    ventasChange,
    pedidos: totals.pedidos,
    pedidosChange,
    ticketMedio: totals.pedidos > 0 ? totals.ventas / totals.pedidos : 0,
    ticketMedioChange,
    openTime: avgOpenTime,
    openTimeChange,
    inversionAds: totals.inversionAds,
    inversionAdsChange: adsChange,
    adsPercentage: totals.ventas > 0 ? (totals.inversionAds / totals.ventas) * 100 : 0,
    inversionPromos: totals.inversionPromos,
    inversionPromosChange: promosChange,
    promosPercentage: totals.ventas > 0 ? (totals.inversionPromos / totals.ventas) * 100 : 0,
    reembolsos: totals.reembolsos,
    reembolsosChange,
    reembolsosPercentage: totals.ventas > 0 ? (totals.reembolsos / totals.ventas) * 100 : 0,
    // New metrics - defaults for demo data (will be overridden with real data)
    netRevenue: totals.ventas - totals.reembolsos,
    netRevenueChange: ventasChange, // Approximate
    uniqueCustomers: 0, // Not available in demo data
    uniqueCustomersChange: 0,
    ordersPerCustomer: 0, // Not available in demo data
    ordersPerCustomerChange: 0,
    avgDiscountPerOrder: totals.pedidos > 0 ? totals.inversionPromos / totals.pedidos : 0,
  };
}

function calculateChannelsFromHierarchy(hierarchy: HierarchyRow[], companyFilter?: string[]): ChannelMetrics[] {
  // Get all channel-level rows
  let channelRows = hierarchy.filter((r) => r.level === 'channel');

  if (companyFilter && companyFilter.length > 0) {
    channelRows = channelRows.filter((r) => r.companyId && companyFilter.includes(r.companyId));
  }

  interface ChannelTotals {
    ventas: number;
    pedidos: number;
    ads: number;
    promos: number;
    reembolsos: number;
    openTimeSum: number;
    count: number;
    ventasChangeWeighted: number;
  }

  const channelTotals: Record<ChannelId, ChannelTotals> = {
    glovo: { ventas: 0, pedidos: 0, ads: 0, promos: 0, reembolsos: 0, openTimeSum: 0, count: 0, ventasChangeWeighted: 0 },
    ubereats: { ventas: 0, pedidos: 0, ads: 0, promos: 0, reembolsos: 0, openTimeSum: 0, count: 0, ventasChangeWeighted: 0 },
    justeat: { ventas: 0, pedidos: 0, ads: 0, promos: 0, reembolsos: 0, openTimeSum: 0, count: 0, ventasChangeWeighted: 0 },
  };

  channelRows.forEach((row) => {
    if (row.channelId) {
      const t = channelTotals[row.channelId];
      t.ventas += row.ventas;
      t.pedidos += row.pedidos;
      t.ads += row.inversionAds;
      t.promos += row.inversionPromos;
      t.reembolsos += row.reembolsos;
      t.openTimeSum += row.openTime;
      t.count += 1;
      t.ventasChangeWeighted += row.ventasChange * row.ventas;
    }
  });

  const totalRevenue = Object.values(channelTotals).reduce((sum, t) => sum + t.ventas, 0);
  const totalPedidos = Object.values(channelTotals).reduce((sum, t) => sum + t.pedidos, 0);

  const channelConfig: { id: ChannelId; name: string; color: string; logo: string }[] = [
    { id: 'glovo', name: 'Glovo', color: '#FFC244', logo: '🟡' },
    { id: 'ubereats', name: 'Uber Eats', color: '#06C167', logo: '🟢' },
    { id: 'justeat', name: 'Just Eat', color: '#FF8000', logo: '🟠' },
  ];

  return channelConfig.map((cfg) => {
    const t = channelTotals[cfg.id];
    const avgOpenTime = t.count > 0 ? t.openTimeSum / t.count : 0;
    const revenueChange = t.ventas > 0 ? t.ventasChangeWeighted / t.ventas : 0;

    return {
      channel: cfg.id,
      name: cfg.name,
      color: cfg.color,
      logo: cfg.logo,
      revenue: t.ventas,
      revenueChange,
      percentage: totalRevenue > 0 ? (t.ventas / totalRevenue) * 100 : 0,
      pedidos: t.pedidos,
      pedidosPercentage: totalPedidos > 0 ? (t.pedidos / totalPedidos) * 100 : 0,
      ticketMedio: t.pedidos > 0 ? t.ventas / t.pedidos : 0,
      openTime: avgOpenTime,
      ads: t.ads,
      adsPercentage: t.ventas > 0 ? (t.ads / t.ventas) * 100 : 0,
      promos: t.promos,
      promosPercentage: t.ventas > 0 ? (t.promos / t.ventas) * 100 : 0,
      reembolsos: t.reembolsos,
      reembolsosPercentage: t.ventas > 0 ? (t.reembolsos / t.ventas) * 100 : 0,
      // New metrics - defaults for demo data
      netRevenue: t.ventas - t.reembolsos,
      uniqueCustomers: 0, // Not available in demo data
    };
  });
}

/**
 * Calculate portfolio metrics from filtered channel data
 * This is used when channel filters are applied
 */
function calculatePortfolioFromChannels(channels: ChannelMetrics[]): PortfolioMetrics {
  const totals = channels.reduce(
    (acc, ch) => ({
      ventas: acc.ventas + ch.revenue,
      pedidos: acc.pedidos + ch.pedidos,
      inversionAds: acc.inversionAds + ch.ads,
      inversionPromos: acc.inversionPromos + ch.promos,
      reembolsos: acc.reembolsos + ch.reembolsos,
      openTimeSum: acc.openTimeSum + ch.openTime,
      count: acc.count + 1,
      // Weighted change calculation
      ventasChangeWeighted: acc.ventasChangeWeighted + (ch.revenueChange * ch.revenue),
      netRevenue: acc.netRevenue + ch.netRevenue,
      uniqueCustomers: acc.uniqueCustomers + ch.uniqueCustomers,
    }),
    { ventas: 0, pedidos: 0, inversionAds: 0, inversionPromos: 0, reembolsos: 0, openTimeSum: 0, count: 0, ventasChangeWeighted: 0, netRevenue: 0, uniqueCustomers: 0 }
  );

  const avgOpenTime = totals.count > 0 ? totals.openTimeSum / totals.count : 0;

  // Calculate weighted average change
  const ventasChange = totals.ventas > 0 ? totals.ventasChangeWeighted / totals.ventas : 0;
  const pedidosChange = ventasChange * 0.8;
  const ticketMedioChange = ventasChange - pedidosChange;

  return {
    ventas: totals.ventas,
    ventasChange,
    pedidos: totals.pedidos,
    pedidosChange,
    ticketMedio: totals.pedidos > 0 ? totals.ventas / totals.pedidos : 0,
    ticketMedioChange,
    openTime: avgOpenTime,
    openTimeChange: ventasChange * 0.6,
    inversionAds: totals.inversionAds,
    inversionAdsChange: ventasChange * 1.1,
    adsPercentage: totals.ventas > 0 ? (totals.inversionAds / totals.ventas) * 100 : 0,
    inversionPromos: totals.inversionPromos,
    inversionPromosChange: ventasChange * 0.9,
    promosPercentage: totals.ventas > 0 ? (totals.inversionPromos / totals.ventas) * 100 : 0,
    reembolsos: totals.reembolsos,
    reembolsosChange: ventasChange * -0.3,
    reembolsosPercentage: totals.ventas > 0 ? (totals.reembolsos / totals.ventas) * 100 : 0,
    // New metrics
    netRevenue: totals.netRevenue,
    netRevenueChange: ventasChange, // Approximate
    uniqueCustomers: totals.uniqueCustomers,
    uniqueCustomersChange: 0, // Not calculated from channels
    ordersPerCustomer: totals.uniqueCustomers > 0 ? totals.pedidos / totals.uniqueCustomers : 0,
    ordersPerCustomerChange: 0,
    avgDiscountPerOrder: totals.pedidos > 0 ? totals.inversionPromos / totals.pedidos : 0,
  };
}

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchControllingData(preset: DatePreset): Promise<HierarchyRow[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return generateHierarchy(preset);
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches controlling data including portfolio metrics, channel stats, and hierarchy.
 * Automatically filters data based on selected companies in global filters.
 *
 * REAL DATA INTEGRATION:
 * When companies are selected, fetches real order data from crp_portal__ft_order_head
 * and uses it to populate portfolio metrics (ventas, pedidos, ticketMedio).
 */
export function useControllingData() {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset, dateRange, brandIds, channelIds, restaurantIds } = useDashboardFiltersStore();

  // Fetch demo hierarchy data (kept for hierarchy visualization)
  const hierarchyQuery = useQuery({
    queryKey: ['controlling-hierarchy', datePreset],
    queryFn: () => fetchControllingData(datePreset),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch REAL order data from CRP Portal
  const ordersQuery = useOrdersData({
    companyIds,
    brandIds: brandIds.length > 0 ? brandIds : undefined,
    addressIds: restaurantIds.length > 0 ? restaurantIds : undefined,
    channelIds: channelIds.length > 0 ? channelIds : undefined,
    dateRange,
    datePreset,
  });

  // Compute filtered data based on filters
  const data = useMemo<ControllingData | undefined>(() => {
    if (!hierarchyQuery.data) return undefined;

    const fullHierarchy = hierarchyQuery.data;

    // Filter hierarchy by company if selected (from global sidebar filter)
    const companyFilter = companyIds.length > 0 ? companyIds : undefined;

    let filteredHierarchy = fullHierarchy;
    if (companyFilter) {
      filteredHierarchy = fullHierarchy.filter((r) => r.companyId && companyFilter.includes(r.companyId));
    }

    // Further filter by brands if selected
    if (brandIds.length > 0) {
      const brandSet = new Set(brandIds);
      const includedIds = new Set<string>();

      filteredHierarchy.forEach((row) => {
        if (row.level === 'brand' && brandSet.has(row.id)) {
          includedIds.add(row.id);
        }
      });

      // Add all children of included brands
      let changed = true;
      while (changed) {
        changed = false;
        filteredHierarchy.forEach((row) => {
          if (row.parentId && includedIds.has(row.parentId) && !includedIds.has(row.id)) {
            includedIds.add(row.id);
            changed = true;
          }
        });
      }

      // Also include parent companies
      filteredHierarchy.forEach((row) => {
        if (includedIds.has(row.id) && row.parentId) {
          let parentId: string | undefined = row.parentId;
          while (parentId) {
            includedIds.add(parentId);
            const parent = filteredHierarchy.find((r) => r.id === parentId);
            parentId = parent?.parentId;
          }
        }
      });

      filteredHierarchy = filteredHierarchy.filter((r) => includedIds.has(r.id));
    }

    // Calculate channel metrics first (before filtering)
    let channels = calculateChannelsFromHierarchy(filteredHierarchy, undefined);

    // Filter channels if specific channels are selected in dashboard filters
    if (channelIds.length > 0) {
      channels = channels.filter((ch) => channelIds.includes(ch.channel));

      // Recalculate percentages for filtered channels
      const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
      const totalPedidos = channels.reduce((sum, ch) => sum + ch.pedidos, 0);

      channels = channels.map((ch) => ({
        ...ch,
        percentage: totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0,
        pedidosPercentage: totalPedidos > 0 ? (ch.pedidos / totalPedidos) * 100 : 0,
      }));
    }

    // Calculate portfolio metrics
    // When channels are filtered, recalculate portfolio from the filtered channels
    // Otherwise, use company-level aggregates
    let portfolio: PortfolioMetrics;

    if (channelIds.length > 0) {
      // Recalculate portfolio from filtered channel data
      portfolio = calculatePortfolioFromChannels(channels);
    } else {
      // Use company-level aggregates (includes all channels)
      portfolio = calculatePortfolioFromHierarchy(filteredHierarchy, undefined);
    }

    // ========================================
    // REAL DATA INTEGRATION
    // ========================================
    // If we have real order data from CRP Portal, use it to override
    // the demo portfolio metrics (ventas, pedidos, ticketMedio)
    if (ordersQuery.data && companyIds.length > 0) {
      const { current, changes } = ordersQuery.data;

      // Override primary KPIs with real data
      portfolio = {
        ...portfolio,
        ventas: current.totalRevenue,
        ventasChange: changes.revenueChange,
        pedidos: current.totalOrders,
        pedidosChange: changes.ordersChange,
        ticketMedio: current.avgTicket,
        ticketMedioChange: changes.avgTicketChange,
        // Reembolsos from real data
        reembolsos: current.totalRefunds,
        reembolsosChange: changes.refundsChange,
        reembolsosPercentage: current.refundRate,
        // Promos/descuentos from real data
        inversionPromos: current.totalDiscounts,
        inversionPromosChange: changes.discountsChange,
        promosPercentage: current.promotionRate,
        // New metrics from CRP Portal
        netRevenue: current.netRevenue,
        netRevenueChange: changes.netRevenueChange,
        uniqueCustomers: current.uniqueCustomers,
        uniqueCustomersChange: changes.uniqueCustomersChange,
        ordersPerCustomer: current.ordersPerCustomer,
        ordersPerCustomerChange: changes.ordersPerCustomerChange,
        avgDiscountPerOrder: current.avgDiscountPerOrder,
      };

      // Update channel metrics with real data
      const channelConfig: { id: ChannelId; name: string; color: string; logo: string }[] = [
        { id: 'glovo', name: 'Glovo', color: '#FFC244', logo: '' },
        { id: 'ubereats', name: 'Uber Eats', color: '#06C167', logo: '' },
        { id: 'justeat', name: 'Just Eat', color: '#FF8000', logo: '' },
      ];

      // Calculate total revenue and orders for percentages
      const totalChannelRevenue = current.byChannel.glovo.revenue +
        current.byChannel.ubereats.revenue +
        current.byChannel.justeat.revenue;
      const totalChannelOrders = current.byChannel.glovo.orders +
        current.byChannel.ubereats.orders +
        current.byChannel.justeat.orders;

      channels = channelConfig.map((cfg) => {
        const channelData = current.byChannel[cfg.id];
        const existingChannel = channels.find((c) => c.channel === cfg.id);

        return {
          channel: cfg.id,
          name: cfg.name,
          color: cfg.color,
          logo: existingChannel?.logo || cfg.logo,
          revenue: channelData.revenue,
          revenueChange: existingChannel?.revenueChange || 0, // Keep demo change for now
          percentage: totalChannelRevenue > 0 ? (channelData.revenue / totalChannelRevenue) * 100 : 0,
          pedidos: channelData.orders,
          pedidosPercentage: totalChannelOrders > 0 ? (channelData.orders / totalChannelOrders) * 100 : 0,
          ticketMedio: channelData.orders > 0 ? channelData.revenue / channelData.orders : 0,
          // Keep demo data for metrics not yet in CRP Portal
          openTime: existingChannel?.openTime || 80,
          ads: existingChannel?.ads || 0,
          adsPercentage: existingChannel?.adsPercentage || 0,
          promos: channelData.discounts,
          promosPercentage: channelData.revenue > 0 ? (channelData.discounts / channelData.revenue) * 100 : 0,
          reembolsos: channelData.refunds,
          reembolsosPercentage: channelData.revenue > 0 ? (channelData.refunds / channelData.revenue) * 100 : 0,
          // New metrics from CRP Portal
          netRevenue: channelData.netRevenue,
          uniqueCustomers: channelData.uniqueCustomers,
        };
      });

      // If channel filter is active, filter the updated channels
      if (channelIds.length > 0) {
        channels = channels.filter((ch) => channelIds.includes(ch.channel));

        // Recalculate percentages for filtered channels
        const filteredTotalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
        const filteredTotalPedidos = channels.reduce((sum, ch) => sum + ch.pedidos, 0);

        channels = channels.map((ch) => ({
          ...ch,
          percentage: filteredTotalRevenue > 0 ? (ch.revenue / filteredTotalRevenue) * 100 : 0,
          pedidosPercentage: filteredTotalPedidos > 0 ? (ch.pedidos / filteredTotalPedidos) * 100 : 0,
        }));
      }
    }

    return {
      portfolio,
      channels,
      hierarchy: filteredHierarchy,
    };
  }, [hierarchyQuery.data, ordersQuery.data, companyIds, brandIds, channelIds]);

  return {
    data,
    isLoading: hierarchyQuery.isLoading || ordersQuery.isLoading,
    error: hierarchyQuery.error || ordersQuery.error,
  };
}
