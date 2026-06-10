export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';
export type EmployeeStatus = 'active' | 'inactive' | 'left';
export type AppRole = 'super_admin' | 'admin' | 'hr' | 'manager' | 'staff';
export type LeaveType = 'annual' | 'medical' | 'unpaid' | 'replacement';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type AttendancePunchType = 'clock_in' | 'clock_out';

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

export type LeaveRequest = {
  id: string;
  profile_id: string;
  employee_id: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  medical_attachment_url: string | null;
  status: LeaveRequestStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceRecord = {
  id: string;
  profile_id: string;
  employee_id: string | null;
  punch_type: AttendancePunchType;
  punched_at: string;
  photo_path: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  ip_address: string | null;
  device_info: string;
  created_at: string;
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
        Relationships: [];
      };
      regions: {
        Row: Region;
        Insert: Partial<Pick<Region, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<Region, 'code' | 'name'>;
        Update: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      employment_types: {
        Row: EmploymentType;
        Insert: Partial<Pick<EmploymentType, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<EmploymentType, 'name'>;
        Update: Partial<Omit<EmploymentType, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      job_titles: {
        Row: JobTitle;
        Insert: Partial<Pick<JobTitle, 'id' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>> &
          Pick<JobTitle, 'name'>;
        Update: Partial<Omit<JobTitle, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Partial<Pick<Employee, 'id' | 'employee_code' | 'email' | 'phone' | 'region_id' | 'employment_type_id' | 'job_title_id' | 'status' | 'hire_date' | 'deleted_at' | 'created_at' | 'updated_at'>> &
          Pick<Employee, 'full_name'> & {
            profile_id?: string | null;
          };
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'employees_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_employment_type_id_fkey';
            columns: ['employment_type_id'];
            isOneToOne: false;
            referencedRelation: 'employment_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_job_title_id_fkey';
            columns: ['job_title_id'];
            isOneToOne: false;
            referencedRelation: 'job_titles';
            referencedColumns: ['id'];
          },
        ];
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Pick<LeaveRequest, 'profile_id' | 'leave_type' | 'start_date' | 'end_date' | 'reason'> &
          Partial<Pick<LeaveRequest, 'id' | 'employee_id' | 'medical_attachment_url' | 'status' | 'review_note' | 'reviewed_by' | 'reviewed_at' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'leave_requests_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leave_requests_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: Pick<AttendanceRecord, 'profile_id' | 'punch_type' | 'photo_path' | 'latitude' | 'longitude' | 'device_info'> &
          Partial<Pick<AttendanceRecord, 'id' | 'employee_id' | 'punched_at' | 'accuracy' | 'ip_address' | 'created_at'>>;
        Update: Partial<Omit<AttendanceRecord, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'attendance_records_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_records_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approve_leave_request: {
        Args: {
          request_id: string;
        };
        Returns: void;
      };
      approve_registration: {
        Args: {
          profile_id: string;
        };
        Returns: void;
      };
      reject_registration: {
        Args: {
          profile_id: string;
          note: string;
        };
        Returns: void;
      };
      reject_leave_request: {
        Args: {
          request_id: string;
          note: string;
        };
        Returns: void;
      };
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
      leave_type: LeaveType;
      leave_request_status: LeaveRequestStatus;
      attendance_punch_type: AttendancePunchType;
    };
    CompositeTypes: Record<string, never>;
  };
};
