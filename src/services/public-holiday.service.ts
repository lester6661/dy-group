import { supabase } from '../lib/supabase';
import type { PublicHoliday, Region } from '../types/database';

export const GLOBAL_REGION_VALUE = '__global__';

export type PublicHolidayListItem = PublicHoliday & {
  region: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export type PublicHolidayFormValues = {
  holiday_name: string;
  holiday_date: string;
  region_id: string;
  note: string;
};

type PublicHolidayRowWithRegion = PublicHoliday & {
  regions: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export const publicHolidayService = {
  async listPublicHolidays(year: number, regionFilter: string): Promise<PublicHolidayListItem[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('public_holidays')
      .select(
        `
          id,
          holiday_name,
          holiday_date,
          region_id,
          note,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at,
          regions:region_id(id, code, name)
        `,
      )
      .eq('is_active', true)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true })
      .order('holiday_name', { ascending: true });

    if (regionFilter === GLOBAL_REGION_VALUE) {
      query = query.is('region_id', null);
    } else if (regionFilter) {
      query = query.eq('region_id', regionFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as PublicHolidayRowWithRegion[]).map(mapPublicHolidayRow);
  },

  async getRegions(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async createPublicHoliday(values: PublicHolidayFormValues) {
    const { error } = await supabase.from('public_holidays').insert(normalizePublicHolidayPayload(values));

    if (error) {
      throw error;
    }
  },

  async updatePublicHoliday(holidayId: string, values: PublicHolidayFormValues) {
    const { error } = await supabase
      .from('public_holidays')
      .update(normalizePublicHolidayPayload(values))
      .eq('id', holidayId);

    if (error) {
      throw error;
    }
  },

  async deletePublicHoliday(holidayId: string) {
    const { error } = await supabase.from('public_holidays').update({ is_active: false }).eq('id', holidayId);

    if (error) {
      throw error;
    }
  },
};

function normalizePublicHolidayPayload(values: PublicHolidayFormValues) {
  return {
    holiday_name: values.holiday_name.trim(),
    holiday_date: values.holiday_date,
    region_id: values.region_id || null,
    note: values.note.trim() || null,
  };
}

function mapPublicHolidayRow(row: PublicHolidayRowWithRegion): PublicHolidayListItem {
  return {
    ...row,
    region: row.regions,
  };
}
