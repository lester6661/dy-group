import { supabase } from '../lib/supabase';
import type { EmployeeStatus, EmploymentType, JobTitle, Region } from '../types/database';

export type EmployeeFormValues = {
  full_name: string;
  phone: string;
  email: string;
  employee_code: string;
  region_id: string;
  employment_type_id: string;
  job_title_id: string;
  status: EmployeeStatus;
  hire_date: string;
};

export type EmployeeListItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  employee_code: string | null;
  region_id: string | null;
  employment_type_id: string | null;
  job_title_id: string | null;
  status: EmployeeStatus;
  hire_date: string | null;
  region: Pick<Region, 'id' | 'code' | 'name'> | null;
  employment_type: Pick<EmploymentType, 'id' | 'name'> | null;
  job_title: Pick<JobTitle, 'id' | 'name'> | null;
};

export type StaffOptions = {
  regions: Region[];
  employmentTypes: EmploymentType[];
  jobTitles: JobTitle[];
};

type EmployeeRowWithRelations = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  employee_code: string | null;
  region_id: string | null;
  employment_type_id: string | null;
  job_title_id: string | null;
  status: EmployeeStatus;
  hire_date: string | null;
  regions: Pick<Region, 'id' | 'code' | 'name'> | null;
  employment_types: Pick<EmploymentType, 'id' | 'name'> | null;
  job_titles: Pick<JobTitle, 'id' | 'name'> | null;
};

export const staffService = {
  async listEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select(
        `
        id,
        full_name,
        phone,
        email,
        employee_code,
        region_id,
        employment_type_id,
        job_title_id,
        status,
        hire_date,
        regions:region_id(id, code, name),
        employment_types:employment_type_id(id, name),
        job_titles:job_title_id(id, name)
      `,
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as EmployeeRowWithRelations[]).map(mapEmployeeRow);
  },

  async getOptions(): Promise<StaffOptions> {
    const [regionsResult, employmentTypesResult, jobTitlesResult] = await Promise.all([
      supabase.from('regions').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('employment_types').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('job_titles').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    if (regionsResult.error) {
      throw regionsResult.error;
    }

    if (employmentTypesResult.error) {
      throw employmentTypesResult.error;
    }

    if (jobTitlesResult.error) {
      throw jobTitlesResult.error;
    }

    return {
      regions: regionsResult.data ?? [],
      employmentTypes: employmentTypesResult.data ?? [],
      jobTitles: jobTitlesResult.data ?? [],
    };
  },

  async createEmployee(values: EmployeeFormValues) {
    const { error } = await supabase.from('employees').insert(normalizeEmployeePayload(values));

    if (error) {
      throw error;
    }
  },

  async updateEmployee(employeeId: string, values: EmployeeFormValues) {
    const { error } = await supabase.from('employees').update(normalizeEmployeePayload(values)).eq('id', employeeId);

    if (error) {
      throw error;
    }
  },

  async softDeleteEmployee(employeeId: string) {
    const { error } = await supabase.rpc('soft_delete_employee', { employee_id: employeeId });

    if (error) {
      throw error;
    }
  },
};

function mapEmployeeRow(row: EmployeeRowWithRelations): EmployeeListItem {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    employee_code: row.employee_code,
    region_id: row.region_id,
    employment_type_id: row.employment_type_id,
    job_title_id: row.job_title_id,
    status: row.status,
    hire_date: row.hire_date,
    region: row.regions,
    employment_type: row.employment_types,
    job_title: row.job_titles,
  };
}

function normalizeEmployeePayload(values: EmployeeFormValues) {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    employee_code: values.employee_code.trim() || null,
    region_id: values.region_id || null,
    employment_type_id: values.employment_type_id || null,
    job_title_id: values.job_title_id || null,
    status: values.status,
    hire_date: values.hire_date || null,
  };
}
