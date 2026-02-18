import { supabase } from '@/services/supabase';
import { mapCompetitor } from './mappers';
import {
  MOCK_COMPETITORS,
  MOCK_HERO,
} from '@/features/compset/config/mockData';
import type { CompsetCompetitor, DbCompsetCompetitor } from '@/types';

const USE_MOCK_DATA = true;

export async function fetchCompsetCompetitors(
  companyId: string
): Promise<CompsetCompetitor[]> {
  if (USE_MOCK_DATA) {
    return MOCK_COMPETITORS.filter((c) => c.companyId === companyId || companyId === '1');
  }

  const { data, error } = await supabase
    .from('compset_competitors')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return (data as DbCompsetCompetitor[]).map(mapCompetitor);
}

export async function fetchCompsetHero(
  companyId: string
): Promise<CompsetCompetitor | null> {
  if (USE_MOCK_DATA) {
    return MOCK_HERO;
  }

  // In real mode, hero is resolved from the company's own brand/address
  // For now returns null - will be wired to CRP Portal data
  void companyId;
  return null;
}

export async function createCompsetCompetitor(
  input: Omit<CompsetCompetitor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CompsetCompetitor> {
  if (USE_MOCK_DATA) {
    return {
      ...input,
      id: `comp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('compset_competitors')
    .insert({
      company_id: input.companyId,
      brand_id: input.brandId,
      address_id: input.addressId,
      name: input.name,
      platform: input.platform,
      external_store_id: input.externalStoreId,
      external_store_url: input.externalStoreUrl,
      logo_url: input.logoUrl,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      is_active: input.isActive,
      display_order: input.displayOrder,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return mapCompetitor(data as DbCompsetCompetitor);
}

export async function updateCompsetCompetitor(
  id: string,
  input: Partial<CompsetCompetitor>
): Promise<CompsetCompetitor> {
  if (USE_MOCK_DATA) {
    const existing = MOCK_COMPETITORS.find((c) => c.id === id) ?? MOCK_HERO;
    return { ...existing, ...input, updatedAt: new Date().toISOString() };
  }

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.platform !== undefined) update.platform = input.platform;
  if (input.externalStoreId !== undefined) update.external_store_id = input.externalStoreId;
  if (input.externalStoreUrl !== undefined) update.external_store_url = input.externalStoreUrl;
  if (input.logoUrl !== undefined) update.logo_url = input.logoUrl;
  if (input.address !== undefined) update.address = input.address;
  if (input.latitude !== undefined) update.latitude = input.latitude;
  if (input.longitude !== undefined) update.longitude = input.longitude;
  if (input.isActive !== undefined) update.is_active = input.isActive;
  if (input.displayOrder !== undefined) update.display_order = input.displayOrder;

  const { data, error } = await supabase
    .from('compset_competitors')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapCompetitor(data as DbCompsetCompetitor);
}

export async function deleteCompsetCompetitor(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;

  const { error } = await supabase
    .from('compset_competitors')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
