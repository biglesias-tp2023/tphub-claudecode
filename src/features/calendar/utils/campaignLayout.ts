/**
 * Campaign Layout Algorithm
 *
 * Shared utility for computing campaign bar positions in week rows.
 * Used by both MonthWeekRow and CalendarWeek components.
 *
 * @module features/calendar/utils/campaignLayout
 */

import type { PromotionalCampaign } from '@/types';

export interface CampaignLayoutRow {
  campaign: PromotionalCampaign;
  startCol: number; // 0-6 (Monday-Sunday)
  endCol: number;   // 0-6 (Monday-Sunday)
  row: number;      // Row index for stacking
}

/**
 * Compute layout rows for campaigns to handle overlapping.
 * Uses a greedy algorithm to assign rows without collisions.
 *
 * @param campaigns - Campaigns to layout
 * @param weekDateStrings - Array of 7 date strings (Mon-Sun) for the week
 */
export function computeCampaignLayout(
  campaigns: PromotionalCampaign[],
  weekDateStrings: string[]
): CampaignLayoutRow[] {
  if (campaigns.length === 0 || weekDateStrings.length !== 7) return [];

  const weekStart = weekDateStrings[0];
  const weekEnd = weekDateStrings[6];

  // Map date string to column index
  const dateToCol = new Map<string, number>();
  weekDateStrings.forEach((dateStr, i) => dateToCol.set(dateStr, i));

  // Filter campaigns that overlap this week
  const weekCampaigns = campaigns.filter(
    c => c.startDate <= weekEnd && c.endDate >= weekStart
  );

  // Sort: by start date, then longest first
  const sortedCampaigns = [...weekCampaigns].sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    const durationA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
    const durationB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
    return durationB - durationA;
  });

  const layout: CampaignLayoutRow[] = [];
  const rowOccupancy: boolean[][] = [];

  for (const campaign of sortedCampaigns) {
    const startCol = Math.max(0, dateToCol.get(campaign.startDate) ?? (campaign.startDate < weekStart ? 0 : 7));
    const endCol = Math.min(6, dateToCol.get(campaign.endDate) ?? (campaign.endDate > weekEnd ? 6 : -1));

    if (startCol > 6 || endCol < 0 || startCol > endCol) continue;

    // Find the first available row
    let assignedRow = 0;
    while (true) {
      if (!rowOccupancy[assignedRow]) {
        rowOccupancy[assignedRow] = new Array(7).fill(false);
      }

      let canFit = true;
      for (let col = startCol; col <= endCol; col++) {
        if (rowOccupancy[assignedRow][col]) {
          canFit = false;
          break;
        }
      }

      if (canFit) {
        for (let col = startCol; col <= endCol; col++) {
          rowOccupancy[assignedRow][col] = true;
        }
        break;
      }
      assignedRow++;
    }

    layout.push({ campaign, startCol, endCol, row: assignedRow });
  }

  return layout;
}
