// ============================================
// WMO WEATHER CODES
// Mapeo de codigos meteorologicos de Open-Meteo
// https://open-meteo.com/en/docs#weathervariables
// ============================================

export interface WeatherCondition {
  code: number;
  description: string;
  descriptionEs: string;
  icon: string;
  isGoodForDelivery: boolean;
}

export const WEATHER_CONDITIONS: Record<number, WeatherCondition> = {
  // Clear sky
  0: {
    code: 0,
    description: 'Clear sky',
    descriptionEs: 'Despejado',
    icon: 'Sun',
    isGoodForDelivery: true,
  },
  // Mainly clear
  1: {
    code: 1,
    description: 'Mainly clear',
    descriptionEs: 'Mayormente despejado',
    icon: 'Sun',
    isGoodForDelivery: true,
  },
  // Partly cloudy
  2: {
    code: 2,
    description: 'Partly cloudy',
    descriptionEs: 'Parcialmente nublado',
    icon: 'CloudSun',
    isGoodForDelivery: true,
  },
  // Overcast
  3: {
    code: 3,
    description: 'Overcast',
    descriptionEs: 'Nublado',
    icon: 'Cloud',
    isGoodForDelivery: true,
  },
  // Fog
  45: {
    code: 45,
    description: 'Fog',
    descriptionEs: 'Niebla',
    icon: 'CloudFog',
    isGoodForDelivery: false,
  },
  // Depositing rime fog
  48: {
    code: 48,
    description: 'Depositing rime fog',
    descriptionEs: 'Niebla con escarcha',
    icon: 'CloudFog',
    isGoodForDelivery: false,
  },
  // Drizzle light
  51: {
    code: 51,
    description: 'Light drizzle',
    descriptionEs: 'Llovizna ligera',
    icon: 'CloudDrizzle',
    isGoodForDelivery: true,
  },
  // Drizzle moderate
  53: {
    code: 53,
    description: 'Moderate drizzle',
    descriptionEs: 'Llovizna moderada',
    icon: 'CloudDrizzle',
    isGoodForDelivery: false,
  },
  // Drizzle dense
  55: {
    code: 55,
    description: 'Dense drizzle',
    descriptionEs: 'Llovizna intensa',
    icon: 'CloudDrizzle',
    isGoodForDelivery: false,
  },
  // Freezing drizzle light
  56: {
    code: 56,
    description: 'Light freezing drizzle',
    descriptionEs: 'Llovizna helada ligera',
    icon: 'CloudDrizzle',
    isGoodForDelivery: false,
  },
  // Freezing drizzle dense
  57: {
    code: 57,
    description: 'Dense freezing drizzle',
    descriptionEs: 'Llovizna helada intensa',
    icon: 'CloudDrizzle',
    isGoodForDelivery: false,
  },
  // Rain slight
  61: {
    code: 61,
    description: 'Slight rain',
    descriptionEs: 'Lluvia ligera',
    icon: 'CloudRain',
    isGoodForDelivery: true,
  },
  // Rain moderate
  63: {
    code: 63,
    description: 'Moderate rain',
    descriptionEs: 'Lluvia moderada',
    icon: 'CloudRain',
    isGoodForDelivery: false,
  },
  // Rain heavy
  65: {
    code: 65,
    description: 'Heavy rain',
    descriptionEs: 'Lluvia intensa',
    icon: 'CloudRain',
    isGoodForDelivery: false,
  },
  // Freezing rain light
  66: {
    code: 66,
    description: 'Light freezing rain',
    descriptionEs: 'Lluvia helada ligera',
    icon: 'CloudRain',
    isGoodForDelivery: false,
  },
  // Freezing rain heavy
  67: {
    code: 67,
    description: 'Heavy freezing rain',
    descriptionEs: 'Lluvia helada intensa',
    icon: 'CloudRain',
    isGoodForDelivery: false,
  },
  // Snow fall slight
  71: {
    code: 71,
    description: 'Slight snow fall',
    descriptionEs: 'Nevada ligera',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Snow fall moderate
  73: {
    code: 73,
    description: 'Moderate snow fall',
    descriptionEs: 'Nevada moderada',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Snow fall heavy
  75: {
    code: 75,
    description: 'Heavy snow fall',
    descriptionEs: 'Nevada intensa',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Snow grains
  77: {
    code: 77,
    description: 'Snow grains',
    descriptionEs: 'Granos de nieve',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Rain showers slight
  80: {
    code: 80,
    description: 'Slight rain showers',
    descriptionEs: 'Chubascos ligeros',
    icon: 'CloudRainWind',
    isGoodForDelivery: true,
  },
  // Rain showers moderate
  81: {
    code: 81,
    description: 'Moderate rain showers',
    descriptionEs: 'Chubascos moderados',
    icon: 'CloudRainWind',
    isGoodForDelivery: false,
  },
  // Rain showers violent
  82: {
    code: 82,
    description: 'Violent rain showers',
    descriptionEs: 'Chubascos fuertes',
    icon: 'CloudRainWind',
    isGoodForDelivery: false,
  },
  // Snow showers slight
  85: {
    code: 85,
    description: 'Slight snow showers',
    descriptionEs: 'Chubascos de nieve ligeros',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Snow showers heavy
  86: {
    code: 86,
    description: 'Heavy snow showers',
    descriptionEs: 'Chubascos de nieve fuertes',
    icon: 'CloudSnow',
    isGoodForDelivery: false,
  },
  // Thunderstorm slight
  95: {
    code: 95,
    description: 'Thunderstorm',
    descriptionEs: 'Tormenta',
    icon: 'CloudLightning',
    isGoodForDelivery: false,
  },
  // Thunderstorm with slight hail
  96: {
    code: 96,
    description: 'Thunderstorm with slight hail',
    descriptionEs: 'Tormenta con granizo ligero',
    icon: 'CloudLightning',
    isGoodForDelivery: false,
  },
  // Thunderstorm with heavy hail
  99: {
    code: 99,
    description: 'Thunderstorm with heavy hail',
    descriptionEs: 'Tormenta con granizo fuerte',
    icon: 'CloudLightning',
    isGoodForDelivery: false,
  },
};

export function getWeatherCondition(code: number): WeatherCondition {
  return WEATHER_CONDITIONS[code] || {
    code,
    description: 'Unknown',
    descriptionEs: 'Desconocido',
    icon: 'Cloud',
    isGoodForDelivery: true,
  };
}

export function getWeatherIcon(code: number): string {
  return getWeatherCondition(code).icon;
}

export function getWeatherDescription(code: number, locale: 'en' | 'es' = 'es'): string {
  const condition = getWeatherCondition(code);
  return locale === 'es' ? condition.descriptionEs : condition.description;
}

export function isGoodWeatherForDelivery(code: number): boolean {
  return getWeatherCondition(code).isGoodForDelivery;
}
