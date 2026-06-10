export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';
export type EmployeeStatus = 'active' | 'inactive' | 'left';
export type AppRole = 'super_admin' | 'admin' | 'hr' | 'manager' | 'staff';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  status: ProfileStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Region = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EmploymentType = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type JobTitle = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  profile_id: string | null;
  employee_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  region_id: string | null;
  employment_type_id: string | null;
  job_title_id: string | null;
  status: EmployeeStatus;
  hire_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, 'id' | 'email' | 'full_name'> & {
          phone?: string | null;
          avatar_url?: string | null;
          review_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: AppRole;
          status?: ProfileStatus;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      regions: {
        Row: Region;
        Insert: Partial<Pick<Region, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<Region, 'code' | 'name'>;
        Update: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>;
      };
      employment_types: {
        Row: EmploymentType;
        Insert: Partial<Pick<EmploymentType, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<EmploymentType, 'name'>;
        Update: Partial<Omit<EmploymentType, 'id' | 'created_at' | 'updated_at'>>;
      };
      job_titles: {
        Row: JobTitle;
        Insert: Partial<Pick<JobTitle, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<JobTitle, 'name'>;
        Update: Partial<Omit<JobTitle, 'id' | 'created_at' | 'updated_at'>>;
      };
      employees: {
        Row: Employee;
        Insert: Partial<Pick<Employee, 'id' | 'employee_code' | 'email' | 'phone' | 'region_id' | 'employment_type_id' | 'job_title_id' | 'status' | 'hire_date' | 'deleted_at' | 'created_at' | 'updated_at'>> &
          Pick<Employee, 'full_name'> & {
            profile_id?: string | null;
          };
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      soft_delete_employee: {
        Args: {
          employee_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      profile_status: ProfileStatus;
      employee_status: EmployeeStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
