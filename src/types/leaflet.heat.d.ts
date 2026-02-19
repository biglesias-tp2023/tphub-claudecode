/**
 * Type declarations for leaflet.heat
 * @see https://github.com/Leaflet/Leaflet.heat
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as L from 'leaflet';

declare module 'leaflet' {
  /**
   * Options for the heatmap layer
   */
  interface HeatLayerOptions {
    /** Minimum opacity the heat will start at */
    minOpacity?: number;
    /** Maximum zoom level up to which the layer will be shown */
    maxZoom?: number;
    /** Maximum point intensity (default: 1.0) */
    max?: number;
    /** Radius of each point of the heatmap (default: 25) */
    radius?: number;
    /** Amount of blur (default: 15) */
    blur?: number;
    /** Color gradient config */
    gradient?: { [key: number]: string };
  }

  /**
   * A heat point with latitude, longitude, and optional intensity
   * [lat, lng] or [lat, lng, intensity]
   */
  type HeatLatLngTuple = [number, number] | [number, number, number];

  /**
   * Heatmap layer class
   */
  class HeatLayer extends Layer {
    constructor(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions);

    /** Set new data points and redraw */
    setLatLngs(latlngs: HeatLatLngTuple[]): this;

    /** Add a single data point */
    addLatLng(latlng: HeatLatLngTuple): this;

    /** Set options and redraw */
    setOptions(options: HeatLayerOptions): this;

    /** Redraw the layer */
    redraw(): this;
  }

  /**
   * Factory function to create a new heatmap layer
   */
  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer;
}
