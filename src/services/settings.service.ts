import { supabase } from '../lib/supabase';
import type { EmploymentType, JobTitle, Region } from '../types/database';

export type SettingsModuleKey = 'regions' | 'job_titles' | 'employment_types';

export type SettingsRecord = Region | JobTitle | EmploymentType;

export type SettingsFormValues = {
  code?: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

const tableMap = {
  regions: 'regions',
  job_titles: 'job_titles',
  employment_types: 'employment_types',
} as const;

export const settingsService = {
  async listSettings(moduleKey: SettingsModuleKey) {
    const { data, error } = await supabase
      .from(tableMap[moduleKey])
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as SettingsRecord[];
  },

  async createSetting(moduleKey: SettingsModuleKey, values: SettingsFormValues) {
    const { error } = await createSettingRecord(moduleKey, values);

    if (error) {
      throw error;
    }
  },

  async updateSetting(moduleKey: SettingsModuleKey, recordId: string, values: SettingsFormValues) {
    const { error } = await updateSettingRecord(moduleKey, recordId, values);

    if (error) {
      throw error;
    }
  },

  async toggleSetting(moduleKey: SettingsModuleKey, recordId: string, isActive: boolean) {
    const { error } =
      moduleKey === 'regions'
        ? await supabase.from('regions').update({ is_active: isActive }).eq('id', recordId)
        : moduleKey === 'job_titles'
          ? await supabase.from('job_titles').update({ is_active: isActive }).eq('id', recordId)
          : await supabase.from('employment_types').update({ is_active: isActive }).eq('id', recordId);

    if (error) {
      throw error;
    }
  },
};

function createSettingRecord(moduleKey: SettingsModuleKey, values: SettingsFormValues) {
  if (moduleKey === 'regions') {
    return supabase.from('regions').insert(getRegionPayload(values));
  }

  if (moduleKey === 'job_titles') {
    return supabase.from('job_titles').insert(getNamedSettingPayload(values));
  }

  return supabase.from('employment_types').insert(getNamedSettingPayload(values));
}

function updateSettingRecord(moduleKey: SettingsModuleKey, recordId: string, values: SettingsFormValues) {
  if (moduleKey === 'regions') {
    return supabase.from('regions').update(getRegionPayload(values)).eq('id', recordId);
  }

  if (moduleKey === 'job_titles') {
    return supabase.from('job_titles').update(getNamedSettingPayload(values)).eq('id', recordId);
  }

  return supabase.from('employment_types').update(getNamedSettingPayload(values)).eq('id', recordId);
}

function getRegionPayload(values: SettingsFormValues) {
  return {
    code: values.code?.trim().toUpperCase() ?? '',
    name: values.name.trim(),
    sort_order: values.sort_order,
    is_active: values.is_active,
  };
}

function getNamedSettingPayload(values: SettingsFormValues) {
  return {
    name: values.name.trim(),
    sort_order: values.sort_order,
    is_active: values.is_active,
  };
}
