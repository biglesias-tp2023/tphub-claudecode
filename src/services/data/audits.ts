/**
 * Audits data operations
 */

import { supabase, handleQueryError } from './shared';
import type {
  AuditType,
  Audit,
  AuditInput,
  AuditWithDetails,
  AuditStatus,
  AuditResponse,
  AuditImage,
  Company,
  Brand,
  DbAuditType,
  DbAudit,
  DbAuditResponse,
  DbAuditImage,
} from '@/types';

function mapDbAuditTypeToAuditType(db: DbAuditType): AuditType {
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    description: db.description,
    icon: db.icon,
    fieldSchema: db.field_schema,
    isActive: db.is_active,
    displayOrder: db.display_order,
    createdAt: db.created_at,
  };
}

function mapDbAuditToAudit(db: DbAudit): Audit {
  return {
    pkIdAudit: db.pk_id_audit,
    pfkIdCompany: db.pfk_id_company,
    pfkIdStore: db.pfk_id_store,
    pfkIdPortal: db.pfk_id_portal,
    pfkIdAuditType: db.pfk_id_audit_type,
    desAuditNumber: db.des_audit_number,
    desStatus: db.des_status as AuditStatus,
    desTitle: db.des_title,
    desNotes: db.des_notes,
    desConsultant: db.des_consultant,
    desKamEvaluator: db.des_kam_evaluator,
    desFieldData: db.des_field_data,
    amtScoreTotal: db.amt_score_total,
    tdCreatedAt: db.td_created_at,
    tdUpdatedAt: db.td_updated_at,
    tdScheduledDate: db.td_scheduled_date,
    tdCompletedAt: db.td_completed_at,
    tdDeliveredAt: db.td_delivered_at,
    pfkCreatedBy: db.pfk_created_by,
    pfkUpdatedBy: db.pfk_updated_by,
  };
}

// Prepared for future use when audit responses are implemented
function _mapDbAuditResponseToAuditResponse(db: DbAuditResponse): AuditResponse {
  return {
    pkIdResponse: db.pk_id_response,
    pfkIdAudit: db.pfk_id_audit,
    desSection: db.des_section,
    desFieldKey: db.des_field_key,
    desFieldType: db.des_field_type as AuditResponse['desFieldType'],
    desValueText: db.des_value_text,
    amtValueNumber: db.amt_value_number,
    tdCreatedAt: db.td_created_at,
    tdUpdatedAt: db.td_updated_at,
  };
}

// Prepared for future use when audit images are implemented
function _mapDbAuditImageToAuditImage(db: DbAuditImage): AuditImage {
  return {
    pkIdImage: db.pk_id_image,
    pfkIdAudit: db.pfk_id_audit,
    desFieldKey: db.des_field_key,
    desStoragePath: db.des_storage_path,
    desFileName: db.des_file_name,
    desMimeType: db.des_mime_type,
    numFileSize: db.num_file_size,
    numSortOrder: db.num_sort_order,
    tdCreatedAt: db.td_created_at,
  };
}

// Export for future use
export { _mapDbAuditResponseToAuditResponse, _mapDbAuditImageToAuditImage };

/**
 * Fetch all active audit types
 */
export async function fetchAuditTypes(): Promise<AuditType[]> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) handleQueryError(error, 'No se pudieron cargar los tipos de auditoría');
  return (data as DbAuditType[]).map(mapDbAuditTypeToAuditType);
}

/**
 * Fetch a single audit type by slug
 */
export async function fetchAuditTypeBySlug(slug: string): Promise<AuditType | null> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar el tipo de auditoría');
  }
  return mapDbAuditTypeToAuditType(data as DbAuditType);
}

/**
 * Fetch a single audit type by ID
 */
export async function fetchAuditTypeById(id: string): Promise<AuditType | null> {
  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar el tipo de auditoría');
  }
  return mapDbAuditTypeToAuditType(data as DbAuditType);
}

interface FetchAuditsParams {
  companyIds?: string[];
  brandIds?: string[];
  auditTypeIds?: string[];
  status?: AuditStatus;
  search?: string;
}

/**
 * Fetch audits with optional filtering
 */
export async function fetchAudits(params: FetchAuditsParams = {}): Promise<Audit[]> {
  let query = supabase
    .from('audits')
    .select('*')
    .order('td_created_at', { ascending: false });

  if (params.companyIds && params.companyIds.length > 0) {
    query = query.in('pfk_id_company', params.companyIds);
  }
  if (params.brandIds && params.brandIds.length > 0) {
    query = query.in('pfk_id_store', params.brandIds);
  }
  if (params.auditTypeIds && params.auditTypeIds.length > 0) {
    query = query.in('pfk_id_audit_type', params.auditTypeIds);
  }
  if (params.status) {
    query = query.eq('des_status', params.status);
  }

  const { data, error } = await query;

  if (error) handleQueryError(error, 'No se pudieron cargar las auditorías');
  return (data as DbAudit[]).map(mapDbAuditToAudit);
}

/**
 * Fetch audits with details (joined data)
 */
export async function fetchAuditsWithDetails(
  params: FetchAuditsParams = {}
): Promise<AuditWithDetails[]> {
  const audits = await fetchAudits(params);

  if (audits.length === 0) return [];

  // Collect unique IDs
  const auditTypeIds = [...new Set(audits.map((a) => a.pfkIdAuditType))];
  const companyIds = [...new Set(audits.filter((a) => a.pfkIdCompany).map((a) => a.pfkIdCompany!))];
  const brandIds = [...new Set(audits.filter((a) => a.pfkIdStore).map((a) => a.pfkIdStore!))];
  const portalIds = [...new Set(audits.filter((a) => a.pfkIdPortal).map((a) => a.pfkIdPortal!))];
  const creatorIds = [...new Set(audits.filter((a) => a.pfkCreatedBy).map((a) => a.pfkCreatedBy!))];

  // Fetch all related data in parallel
  const [
    { data: auditTypes },
    { data: companies },
    { data: brands },
    { data: portals },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('audit_types').select('*').in('id', auditTypeIds),
    companyIds.length > 0
      ? supabase.from('crp_portal__dt_company').select('pk_id_company, des_company_name, flg_deleted').in('pk_id_company', companyIds.map(Number)).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_company: number; des_company_name: string; flg_deleted: number }> }),
    brandIds.length > 0
      ? supabase.from('crp_portal__dt_store').select('pk_id_store, des_store, pfk_id_company, flg_deleted').in('pk_id_store', brandIds.map(Number)).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_store: number; des_store: string; pfk_id_company: number; flg_deleted: number }> }),
    portalIds.length > 0
      ? supabase.from('crp_portal__dt_portal').select('pk_id_portal, des_portal').in('pk_id_portal', portalIds).order('pk_ts_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ pk_id_portal: string; des_portal: string }> }),
    creatorIds.length > 0
      ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
  ]);

  // Build audit type map
  const auditTypeMap = new Map(
    (auditTypes as DbAuditType[] || []).map((t) => [t.id, mapDbAuditTypeToAuditType(t)])
  );

  // Build company map (deduplicate by PK, keep most recent)
  const companyMap = new Map<string, Company>();
  for (const c of (companies || []) as Array<{ pk_id_company: number; des_company_name: string; flg_deleted: number }>) {
    const id = String(c.pk_id_company);
    if (!companyMap.has(id)) {
      companyMap.set(id, { id, name: c.des_company_name } as Company);
    }
  }

  // Build brand map (deduplicate by PK, keep most recent)
  const brandMap = new Map<string, Brand>();
  for (const b of (brands || []) as Array<{ pk_id_store: number; des_store: string; pfk_id_company: number; flg_deleted: number }>) {
    const id = String(b.pk_id_store);
    if (!brandMap.has(id)) {
      brandMap.set(id, { id, name: b.des_store, companyId: String(b.pfk_id_company) } as Brand);
    }
  }

  // Build portal map (deduplicate by PK, keep most recent)
  const portalMap = new Map<string, { id: string; name: string }>();
  for (const p of (portals || []) as Array<{ pk_id_portal: string; des_portal: string }>) {
    const id = String(p.pk_id_portal);
    if (!portalMap.has(id)) {
      portalMap.set(id, { id, name: p.des_portal });
    }
  }

  // Build creator map
  const creatorMap = new Map(
    (profiles || []).map((p: { id: string; full_name: string | null; avatar_url: string | null }) => [
      p.id,
      { fullName: p.full_name || 'Usuario', avatarUrl: p.avatar_url },
    ])
  );

  // Enrich audits
  return audits.map((audit) => ({
    ...audit,
    auditType: auditTypeMap.get(audit.pfkIdAuditType),
    company: audit.pfkIdCompany ? companyMap.get(audit.pfkIdCompany) : undefined,
    brand: audit.pfkIdStore ? brandMap.get(audit.pfkIdStore) : undefined,
    portal: audit.pfkIdPortal ? portalMap.get(audit.pfkIdPortal) : undefined,
    createdByProfile: audit.pfkCreatedBy ? creatorMap.get(audit.pfkCreatedBy) : undefined,
  }));
}

/**
 * Fetch a single audit by ID
 */
export async function fetchAuditById(id: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('pk_id_audit', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    handleQueryError(error, 'No se pudo cargar la auditoría');
  }
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Fetch a single audit with details by ID
 */
export async function fetchAuditWithDetailsById(id: string): Promise<AuditWithDetails | null> {
  const audit = await fetchAuditById(id);
  if (!audit) return null;

  // Fetch company from CRP Portal
  const fetchCrpCompanyById = async (companyId: string): Promise<Company | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_company')
      .select('pk_id_company, des_company, des_key_account_manager, flg_deleted')
      .eq('pk_id_company', Number(companyId))
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const mostRecent = data[0];
    if (mostRecent.flg_deleted !== 0) return null;
    return {
      id: String(mostRecent.pk_id_company),
      name: mostRecent.des_company,
      keyAccountManager: mostRecent.des_key_account_manager,
    } as Company;
  };

  // Fetch brand from CRP Portal
  // NOTE: Do NOT filter flg_deleted - get most recent snapshot first
  const fetchBrandById = async (brandId: string): Promise<Brand | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_store')
      .select('pk_id_store, des_store, pfk_id_company, flg_deleted')
      .eq('pk_id_store', Number(brandId))
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const mostRecent = data[0];
    if (mostRecent.flg_deleted !== 0) return null;
    return {
      id: String(mostRecent.pk_id_store),
      name: mostRecent.des_store,
      companyId: String(mostRecent.pfk_id_company),
    } as Brand;
  };

  // Fetch portal name from CRP Portal
  const fetchPortalById = async (portalId: string): Promise<{ id: string; name: string } | null> => {
    const { data } = await supabase
      .from('crp_portal__dt_portal')
      .select('pk_id_portal, des_portal')
      .eq('pk_id_portal', portalId)
      .order('pk_ts_month', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    return { id: String(data[0].pk_id_portal), name: data[0].des_portal };
  };

  const fetchCreatorProfile = async () => {
    if (!audit.pfkCreatedBy) return null;
    try {
      return await supabase.from('profiles').select('full_name, avatar_url').eq('id', audit.pfkCreatedBy).single();
    } catch {
      return null;
    }
  };

  const [auditType, company, brand, portal, creator] = await Promise.all([
    fetchAuditTypeById(audit.pfkIdAuditType).catch((error) => { console.warn('[audits] fetchAuditTypeById failed:', error); return null; }),
    audit.pfkIdCompany ? fetchCrpCompanyById(audit.pfkIdCompany).catch((error) => { console.warn('[audits] fetchCrpCompanyById failed:', error); return null; }) : null,
    audit.pfkIdStore ? fetchBrandById(audit.pfkIdStore).catch((error) => { console.warn('[audits] fetchBrandById failed:', error); return null; }) : null,
    audit.pfkIdPortal ? fetchPortalById(audit.pfkIdPortal).catch((error) => { console.warn('[audits] fetchPortalById failed:', error); return null; }) : null,
    fetchCreatorProfile(),
  ]);

  return {
    ...audit,
    auditType: auditType || undefined,
    company: company || undefined,
    brand: brand || undefined,
    portal: portal || undefined,
    createdByProfile: creator?.data
      ? { fullName: creator.data.full_name || 'Usuario', avatarUrl: creator.data.avatar_url }
      : undefined,
  };
}

/**
 * Create a new audit
 */
export async function createAudit(input: AuditInput): Promise<Audit> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbInput: Record<string, unknown> = {
    pfk_id_company: input.pfkIdCompany || null,
    pfk_id_store: input.pfkIdStore || null,
    pfk_id_portal: input.pfkIdPortal || null,
    pfk_id_audit_type: input.pfkIdAuditType,
    des_audit_number: input.desAuditNumber || null,
    des_title: input.desTitle || null,
    des_notes: input.desNotes || null,
    des_consultant: input.desConsultant || null,
    des_kam_evaluator: input.desKamEvaluator || null,
    des_field_data: input.desFieldData || null,
    des_status: input.desStatus || 'draft',
    td_scheduled_date: input.tdScheduledDate || null,
    pfk_created_by: userId,
    pfk_updated_by: userId,
  };

  const { data, error } = await supabase
    .from('audits')
    .insert(dbInput)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al crear la auditoría');
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Update an audit
 */
export async function updateAudit(
  id: string,
  updates: Partial<AuditInput> & { desStatus?: AuditStatus; amtScoreTotal?: number; tdDeliveredAt?: string }
): Promise<Audit> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const dbUpdates: Record<string, unknown> = { pfk_updated_by: userId };

  if (updates.pfkIdCompany !== undefined) dbUpdates.pfk_id_company = updates.pfkIdCompany;
  if (updates.pfkIdStore !== undefined) dbUpdates.pfk_id_store = updates.pfkIdStore;
  if (updates.pfkIdPortal !== undefined) dbUpdates.pfk_id_portal = updates.pfkIdPortal;
  if (updates.desAuditNumber !== undefined) dbUpdates.des_audit_number = updates.desAuditNumber;
  if (updates.desTitle !== undefined) dbUpdates.des_title = updates.desTitle;
  if (updates.desNotes !== undefined) dbUpdates.des_notes = updates.desNotes;
  if (updates.desConsultant !== undefined) dbUpdates.des_consultant = updates.desConsultant;
  if (updates.desKamEvaluator !== undefined) dbUpdates.des_kam_evaluator = updates.desKamEvaluator;
  if (updates.amtScoreTotal !== undefined) dbUpdates.amt_score_total = updates.amtScoreTotal;
  if (updates.desFieldData !== undefined) dbUpdates.des_field_data = updates.desFieldData;
  if (updates.tdScheduledDate !== undefined) dbUpdates.td_scheduled_date = updates.tdScheduledDate;
  if (updates.desStatus !== undefined) {
    dbUpdates.des_status = updates.desStatus;
    if (updates.desStatus === 'completed') {
      dbUpdates.td_completed_at = new Date().toISOString();
    }
    if (updates.desStatus === 'delivered') {
      dbUpdates.td_delivered_at = updates.tdDeliveredAt || new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('audits')
    .update(dbUpdates)
    .eq('pk_id_audit', id)
    .select()
    .single();

  if (error) handleQueryError(error, 'Error al actualizar la auditoría');
  return mapDbAuditToAudit(data as DbAudit);
}

/**
 * Delete an audit
 */
export async function deleteAudit(id: string): Promise<void> {
  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('pk_id_audit', id);

  if (error) handleQueryError(error, 'Error al eliminar la auditoría');
}

/**
 * Mark an audit as completed
 */
export async function completeAudit(id: string): Promise<Audit> {
  return updateAudit(id, { desStatus: 'completed' });
}
