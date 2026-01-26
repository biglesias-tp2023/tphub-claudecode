import type { MapRestaurant, Coordinates, ChannelKPI, DeliveryPoint } from '../types/maps.types';
import type { ChannelId } from '@/types';

// ============================================
// CITY COORDINATES (SPAIN)
// ============================================

export const CITY_COORDINATES: Record<string, Coordinates> = {
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Valencia': { lat: 39.4699, lng: -0.3763 },
  'Sevilla': { lat: 37.3891, lng: -5.9845 },
  'Malaga': { lat: 36.7213, lng: -4.4214 },
  'Bilbao': { lat: 43.2630, lng: -2.9350 },
  'Zaragoza': { lat: 41.6488, lng: -0.8891 },
};

// Default center (Spain)
export const DEFAULT_CENTER: Coordinates = { lat: 40.4168, lng: -3.7038 };
export const DEFAULT_ZOOM = 6;

// ============================================
// CHANNEL BREAKDOWN HELPER
// ============================================

function createChannelBreakdown(
  channels: ChannelId[],
  totalVentas: number
): ChannelKPI[] {
  const channelConfig: Record<ChannelId, { name: string; color: string }> = {
    glovo: { name: 'Glovo', color: '#ffc244' },
    ubereats: { name: 'Uber Eats', color: '#06c167' },
    justeat: { name: 'Just Eat', color: '#ff8000' },
  };

  const activeChannels = channels.filter(ch => channelConfig[ch]);
  if (activeChannels.length === 0) return [];

  // Distribute sales somewhat randomly between channels
  const percentages: number[] = [];
  let remaining = 100;

  activeChannels.forEach((_, i) => {
    if (i === activeChannels.length - 1) {
      percentages.push(remaining);
    } else {
      const pct = Math.floor(Math.random() * (remaining - (activeChannels.length - i - 1) * 10)) + 10;
      percentages.push(pct);
      remaining -= pct;
    }
  });

  return activeChannels.map((ch, i) => ({
    channelId: ch,
    channelName: channelConfig[ch].name,
    color: channelConfig[ch].color,
    ventas: Math.round(totalVentas * percentages[i] / 100),
    pedidos: Math.round((totalVentas * percentages[i] / 100) / (18 + Math.random() * 10)),
    percentage: percentages[i],
  }));
}

// ============================================
// RANDOM KPI GENERATOR
// ============================================

function generateKPIs(channels: ChannelId[]) {
  const ventas = Math.round(5000 + Math.random() * 20000);
  const pedidos = Math.round(ventas / (18 + Math.random() * 10));
  const tiempoMin = Math.round(4 + Math.random() * 12);

  return {
    ventas,
    ventasChange: Math.round((Math.random() * 30 - 10) * 10) / 10,
    pedidos,
    ticketMedio: Math.round(ventas / pedidos),
    nuevosClientes: Math.round(pedidos * (0.08 + Math.random() * 0.12)),
    porcentajeNuevos: Math.round(8 + Math.random() * 12),
    tiempoEspera: `${tiempoMin}m`,
    tiempoEsperaMin: tiempoMin,
    valoraciones: Math.round((3.8 + Math.random() * 1.1) * 10) / 10,
    channelBreakdown: createChannelBreakdown(channels, ventas),
  };
}

// ============================================
// DEMO RESTAURANTS DATA
// Matching IDs from useRestaurants.ts DEMO_RESTAURANTS
// ============================================

export const DEMO_MAP_RESTAURANTS: MapRestaurant[] = [
  // ========== VICIO ==========
  // VICIO - Madrid
  {
    id: 'vicio-madrid-centro',
    name: 'Gran Vía 42',
    address: 'Gran Vía 42, Madrid',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Madrid',
    areaId: 'vicio-madrid',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 40.4203, lng: -3.7059 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'vicio-madrid-chamberi',
    name: 'Chamberí',
    address: 'Chamberí, Madrid',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Madrid',
    areaId: 'vicio-madrid',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 40.4350, lng: -3.7020 },
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'vicio-madrid-salamanca',
    name: 'Salamanca',
    address: 'Salamanca, Madrid',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Madrid',
    areaId: 'vicio-madrid',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 40.4280, lng: -3.6850 },
    deliveryRadiusKm: 2.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // VICIO - Barcelona
  {
    id: 'vicio-barcelona-eixample',
    name: 'Eixample',
    address: 'Eixample, Barcelona',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Barcelona',
    areaId: 'vicio-barcelona',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 41.3910, lng: 2.1620 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'vicio-barcelona-gracia',
    name: 'Gràcia',
    address: 'Gràcia, Barcelona',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Barcelona',
    areaId: 'vicio-barcelona',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 41.4036, lng: 2.1560 },
    deliveryRadiusKm: 2.8,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // VICIO - Valencia
  {
    id: 'vicio-valencia-centro',
    name: 'El Carmen',
    address: 'El Carmen, Valencia',
    brandName: 'VICIO',
    brandId: 'vicio-brand',
    areaName: 'Valencia',
    areaId: 'vicio-valencia',
    companyName: 'VICIO',
    companyId: 'vicio',
    coordinates: { lat: 39.4780, lng: -0.3800 },
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },

  // ========== GOIKO ==========
  // Goiko Grill - Madrid
  {
    id: 'goiko-madrid-sol',
    name: 'Sol',
    address: 'Sol, Madrid',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Madrid',
    areaId: 'goiko-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4168, lng: -3.7038 },
    deliveryRadiusKm: 2.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'goiko-madrid-chamberi',
    name: 'Chamberí',
    address: 'Chamberí, Madrid',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Madrid',
    areaId: 'goiko-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4380, lng: -3.7080 },
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'goiko-madrid-moncloa',
    name: 'Moncloa',
    address: 'Moncloa, Madrid',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Madrid',
    areaId: 'goiko-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4350, lng: -3.7200 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  {
    id: 'goiko-madrid-retiro',
    name: 'Retiro',
    address: 'Retiro, Madrid',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Madrid',
    areaId: 'goiko-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4150, lng: -3.6850 },
    deliveryRadiusKm: 2.8,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'goiko-madrid-lavapies',
    name: 'Lavapiés',
    address: 'Lavapiés, Madrid',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Madrid',
    areaId: 'goiko-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4080, lng: -3.7000 },
    deliveryRadiusKm: 2.2,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // Goiko Grill - Barcelona
  {
    id: 'goiko-barcelona-born',
    name: 'El Born',
    address: 'El Born, Barcelona',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Barcelona',
    areaId: 'goiko-barcelona',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 41.3850, lng: 2.1820 },
    deliveryRadiusKm: 2.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'goiko-barcelona-diagonal',
    name: 'Diagonal',
    address: 'Diagonal, Barcelona',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Barcelona',
    areaId: 'goiko-barcelona',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 41.3970, lng: 2.1600 },
    deliveryRadiusKm: 3.2,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  {
    id: 'goiko-barcelona-gracia',
    name: 'Gràcia',
    address: 'Gràcia, Barcelona',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Barcelona',
    areaId: 'goiko-barcelona',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 41.4010, lng: 2.1530 },
    deliveryRadiusKm: 2.8,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  // Goiko Grill - Valencia
  {
    id: 'goiko-valencia-ruzafa',
    name: 'Ruzafa',
    address: 'Ruzafa, Valencia',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Valencia',
    areaId: 'goiko-valencia',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 39.4620, lng: -0.3720 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'goiko-valencia-centro',
    name: 'Centro',
    address: 'Centro, Valencia',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Valencia',
    areaId: 'goiko-valencia',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 39.4700, lng: -0.3763 },
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // Goiko Grill - Sevilla
  {
    id: 'goiko-sevilla-triana',
    name: 'Triana',
    address: 'Triana, Sevilla',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Sevilla',
    areaId: 'goiko-sevilla',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 37.3830, lng: -6.0050 },
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  {
    id: 'goiko-sevilla-nervion',
    name: 'Nervión',
    address: 'Nervión, Sevilla',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Sevilla',
    areaId: 'goiko-sevilla',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 37.3870, lng: -5.9700 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  // Goiko Grill - Málaga
  {
    id: 'goiko-malaga-centro',
    name: 'Centro Histórico',
    address: 'Centro Histórico, Málaga',
    brandName: 'Goiko Grill',
    brandId: 'goiko-grill',
    areaName: 'Málaga',
    areaId: 'goiko-malaga',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 36.7210, lng: -4.4200 },
    deliveryRadiusKm: 4.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },

  // Kevin Bacon - Madrid
  {
    id: 'kevin-madrid-malasana',
    name: 'Malasaña',
    address: 'Malasaña, Madrid',
    brandName: 'Kevin Bacon',
    brandId: 'goiko-kevin-bacon',
    areaName: 'Madrid',
    areaId: 'kevin-madrid',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 40.4260, lng: -3.7070 },
    deliveryRadiusKm: 2.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // Kevin Bacon - Barcelona
  {
    id: 'kevin-barcelona-raval',
    name: 'El Raval',
    address: 'El Raval, Barcelona',
    brandName: 'Kevin Bacon',
    brandId: 'goiko-kevin-bacon',
    areaName: 'Barcelona',
    areaId: 'kevin-barcelona',
    companyName: 'Goiko',
    companyId: 'goiko',
    coordinates: { lat: 41.3800, lng: 2.1680 },
    deliveryRadiusKm: 2.8,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },

  // ========== LA TAGLIATELLA ==========
  // La Tagliatella - Madrid
  {
    id: 'tagliatella-madrid-princesa',
    name: 'Princesa',
    address: 'Princesa, Madrid',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Madrid',
    areaId: 'tagliatella-madrid',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 40.4280, lng: -3.7150 },
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'tagliatella-madrid-xanadu',
    name: 'Xanadú',
    address: 'Xanadú, Madrid',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Madrid',
    areaId: 'tagliatella-madrid',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 40.3450, lng: -3.9350 },
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // La Tagliatella - Valencia
  {
    id: 'tagliatella-valencia-centro',
    name: 'Centro',
    address: 'Centro, Valencia',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Valencia',
    areaId: 'tagliatella-valencia',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 39.4720, lng: -0.3780 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'tagliatella-valencia-aqua',
    name: 'Aqua',
    address: 'Aqua, Valencia',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Valencia',
    areaId: 'tagliatella-valencia',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 39.4550, lng: -0.3520 },
    deliveryRadiusKm: 4.0,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
  // La Tagliatella - Barcelona
  {
    id: 'tagliatella-barcelona-maremagnum',
    name: 'Maremagnum',
    address: 'Maremagnum, Barcelona',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Barcelona',
    areaId: 'tagliatella-barcelona',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 41.3750, lng: 2.1820 },
    deliveryRadiusKm: 3.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  // La Tagliatella - Zaragoza
  {
    id: 'tagliatella-zaragoza-centro',
    name: 'Plaza España',
    address: 'Plaza España, Zaragoza',
    brandName: 'La Tagliatella',
    brandId: 'tagliatella-brand',
    areaName: 'Zaragoza',
    areaId: 'tagliatella-zaragoza',
    companyName: 'La Tagliatella',
    companyId: 'tagliatella',
    coordinates: { lat: 41.6520, lng: -0.8790 },
    deliveryRadiusKm: 4.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },

  // ========== TELEPIZZA ==========
  // Telepizza - Madrid
  {
    id: 'telepizza-madrid-vallecas',
    name: 'Vallecas',
    address: 'Vallecas, Madrid',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Madrid',
    areaId: 'telepizza-madrid',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 40.3850, lng: -3.6520 },
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'telepizza-madrid-getafe',
    name: 'Getafe',
    address: 'Getafe, Madrid',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Madrid',
    areaId: 'telepizza-madrid',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 40.3080, lng: -3.7330 },
    deliveryRadiusKm: 5.5,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'telepizza-madrid-alcorcon',
    name: 'Alcorcón',
    address: 'Alcorcón, Madrid',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Madrid',
    areaId: 'telepizza-madrid',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 40.3450, lng: -3.8250 },
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'justeat'],
    kpis: generateKPIs(['glovo', 'justeat']),
  },
  // Telepizza - Sevilla
  {
    id: 'telepizza-sevilla-triana',
    name: 'Triana',
    address: 'Triana, Sevilla',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Sevilla',
    areaId: 'telepizza-sevilla',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 37.3850, lng: -6.0080 },
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },
  {
    id: 'telepizza-sevilla-este',
    name: 'Sevilla Este',
    address: 'Sevilla Este, Sevilla',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Sevilla',
    areaId: 'telepizza-sevilla',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 37.4000, lng: -5.9400 },
    deliveryRadiusKm: 6.0,
    activeChannels: ['glovo', 'justeat'],
    kpis: generateKPIs(['glovo', 'justeat']),
  },
  // Telepizza - Bilbao
  {
    id: 'telepizza-bilbao-deusto',
    name: 'Deusto',
    address: 'Deusto, Bilbao',
    brandName: 'Telepizza',
    brandId: 'telepizza-brand',
    areaName: 'Bilbao',
    areaId: 'telepizza-bilbao',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 43.2700, lng: -2.9450 },
    deliveryRadiusKm: 5.0,
    activeChannels: ['glovo', 'ubereats', 'justeat'],
    kpis: generateKPIs(['glovo', 'ubereats', 'justeat']),
  },

  // ========== JENO'S PIZZA ==========
  // Jeno's Pizza - Madrid
  {
    id: 'jenos-madrid-centro',
    name: 'Centro',
    address: 'Centro, Madrid',
    brandName: "Jeno's Pizza",
    brandId: 'telepizza-jenos',
    areaName: 'Madrid',
    areaId: 'jenos-madrid',
    companyName: 'Telepizza',
    companyId: 'telepizza',
    coordinates: { lat: 40.4190, lng: -3.7010 },
    deliveryRadiusKm: 3.5,
    activeChannels: ['glovo', 'ubereats'],
    kpis: generateKPIs(['glovo', 'ubereats']),
  },
];

// ============================================
// DELIVERY POINTS GENERATOR
// ============================================

/**
 * Generate a random point within a given radius from center
 */
function randomPointInRadius(center: Coordinates, radiusKm: number): Coordinates {
  // Convert radius to degrees (approximate)
  const radiusDeg = radiusKm / 111.32; // ~111km per degree at equator

  // Random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * radiusDeg; // sqrt for uniform distribution

  return {
    lat: center.lat + distance * Math.cos(angle),
    lng: center.lng + distance * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180),
  };
}

/**
 * Generate 50 simulated delivery points distributed across restaurants
 */
export function generateDeliveryPoints(restaurants: MapRestaurant[]): DeliveryPoint[] {
  if (restaurants.length === 0) return [];

  const deliveryPoints: DeliveryPoint[] = [];

  // Generate 50 orders distributed across restaurants
  for (let i = 0; i < 50; i++) {
    // Pick a random restaurant (weighted by their order count for more realism)
    const totalPedidos = restaurants.reduce((sum, r) => sum + r.kpis.pedidos, 0);
    let randomWeight = Math.random() * totalPedidos;
    let selectedRestaurant = restaurants[0];

    for (const restaurant of restaurants) {
      randomWeight -= restaurant.kpis.pedidos;
      if (randomWeight <= 0) {
        selectedRestaurant = restaurant;
        break;
      }
    }

    // Generate random point within restaurant's delivery radius
    const deliveryLocation = randomPointInRadius(
      selectedRestaurant.coordinates,
      selectedRestaurant.deliveryRadiusKm
    );

    // Pick a random channel from the restaurant's active channels
    const availableChannels = selectedRestaurant.activeChannels;
    const channel = availableChannels[Math.floor(Math.random() * availableChannels.length)];

    // Generate random order data
    const orderValue = Math.round((12 + Math.random() * 35) * 100) / 100;
    const hasRating = Math.random() > 0.4; // 60% have ratings
    const rating = hasRating ? Math.round((3.5 + Math.random() * 1.5) * 10) / 10 : null;
    const deliveryTimeMin = Math.round(15 + Math.random() * 40);
    const isNewCustomer = Math.random() > 0.85; // 15% new customers

    // Random timestamp in the last 7 days
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7));
    timestamp.setHours(Math.floor(11 + Math.random() * 12)); // 11am to 11pm
    timestamp.setMinutes(Math.floor(Math.random() * 60));

    // Random incidence (10% of orders have incidences)
    const hasIncidence = Math.random() > 0.9;
    const incidenceTypes = ['producto_faltante', 'demora', 'producto_danado', 'pedido_incorrecto'];
    const incidenceType = hasIncidence
      ? incidenceTypes[Math.floor(Math.random() * incidenceTypes.length)]
      : undefined;

    deliveryPoints.push({
      id: `order-${i + 1}`,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      channel,
      coordinates: deliveryLocation,
      orderValue,
      rating,
      deliveryTimeMin,
      isNewCustomer,
      timestamp,
      hasIncidence,
      incidenceType,
    });
  }

  return deliveryPoints;
}

/**
 * Calculate bounds from a list of restaurants
 */
export function calculateBounds(
  restaurants: MapRestaurant[]
): [[number, number], [number, number]] | null {
  if (restaurants.length === 0) return null;

  let minLat = restaurants[0].coordinates.lat;
  let maxLat = restaurants[0].coordinates.lat;
  let minLng = restaurants[0].coordinates.lng;
  let maxLng = restaurants[0].coordinates.lng;

  restaurants.forEach((r) => {
    minLat = Math.min(minLat, r.coordinates.lat);
    maxLat = Math.max(maxLat, r.coordinates.lat);
    minLng = Math.min(minLng, r.coordinates.lng);
    maxLng = Math.max(maxLng, r.coordinates.lng);
  });

  // Add padding
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding],
  ];
}

/**
 * Calculate center from a list of restaurants
 */
export function calculateCenter(restaurants: MapRestaurant[]): Coordinates {
  if (restaurants.length === 0) return DEFAULT_CENTER;

  const sumLat = restaurants.reduce((sum, r) => sum + r.coordinates.lat, 0);
  const sumLng = restaurants.reduce((sum, r) => sum + r.coordinates.lng, 0);

  return {
    lat: sumLat / restaurants.length,
    lng: sumLng / restaurants.length,
  };
}
