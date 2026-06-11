import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Edit3, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { type EmployeeFormValues, type EmployeeListItem, type StaffOptions, staffService } from '../services/staff.service';
import type { EmployeeStatus } from '../types/database';

const emptyForm: EmployeeFormValues = {
  full_name: '',
  nickname: '',
  avatar_url: '',
  phone: '',
  email: '',
  employee_code: '',
  birthday: '',
  identity_number: '',
  address: '',
  bank_name: '',
  bank_account: '',
  base_salary: '',
  region_id: '',
  employment_type_id: '',
  job_title_id: '',
  status: 'active',
  hire_date: '',
  start_work_time: '09:00',
  end_work_time: '18:00',
  require_attendance: true,
};

const statusLabels: Record<EmployeeStatus, string> = {
  active: '在职',
  inactive: '停用',
  left: '离职',
};

export function StaffPage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const canManageStaff = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'hr';
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [options, setOptions] = useState<StaffOptions>({ regions: [], employmentTypes: [], jobTitles: [] });
  const [formValues, setFormValues] = useState<EmployeeFormValues>(emptyForm);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredEmployees = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return employees;

    return employees.filter((employee) =>
      [employee.full_name, employee.nickname, employee.employee_code, employee.job_title?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [employees, searchTerm]);

  useEffect(() => {
    void loadStaffData();
  }, []);

  async function loadStaffData() {
    setLoading(true);
    setError('');

    try {
      const [employeeList, optionList] = await Promise.all([staffService.listEmployees(), staffService.getOptions()]);
      setEmployees(employeeList);
      setOptions(optionList);
    } catch (loadError) {
      setError(`读取工作人员资料失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingEmployee) {
        await staffService.updateEmployee(editingEmployee.id, formValues);
        setMessage('工作人员资料已更新。');
      } else {
        await staffService.createEmployee(formValues);
        setMessage('工作人员已新增。');
      }

      resetForm();
      await loadStaffData();
    } catch (saveError) {
      setError(`保存工作人员资料失败：${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingEmployee(null);
    setFormValues(emptyForm);
    setShowStaffModal(true);
    setMessage('');
    setError('');
  }

  function handleEdit(employee: EmployeeListItem) {
    setEditingEmployee(employee);
    setShowStaffModal(true);
    setMessage('');
    setError('');
    setFormValues(toFormValues(employee));
  }

  function resetForm() {
    setEditingEmployee(null);
    setFormValues(emptyForm);
    setShowStaffModal(false);
  }

  return (
    <section className="staff-page">
      <div className="toolbar-actions staff-actions-row">
        {canManageStaff ? (
          <button className="secondary-action" type="button" onClick={openCreate}>
            <Plus size={17} />
            <span>新增员工</span>
          </button>
        ) : null}
        <button className="secondary-action" type="button" onClick={loadStaffData} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="staff-list-panel">
        <div className="list-header">
          <div>
            <span>员工列表</span>
            <h3>{filteredEmployees.length} 位员工</h3>
          </div>
          <label className="table-search">
            <Search size={16} />
            <input placeholder="搜索名字、昵称、职位" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
        </div>

        {loading ? (
          <div className="table-state">正在读取工作人员...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="table-state">暂无工作人员资料。</div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table staff-simple-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>头像</th>
                  <th>名字</th>
                  <th>昵称</th>
                  <th>职位</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <span className={`status-pill status-${employee.status}`}>{statusLabels[employee.status]}</span>
                    </td>
                    <td>
                      <EmployeeAvatar employee={employee} />
                    </td>
                    <td>
                      <button className="text-link-button" type="button" onClick={() => setSelectedEmployee(employee)}>
                        {employee.full_name}
                      </button>
                    </td>
                    <td>{employee.nickname || '-'}</td>
                    <td>{employee.job_title?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEmployee ? (
        <EmployeeDetailModal
          employee={selectedEmployee}
          canManageStaff={canManageStaff}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => {
            setSelectedEmployee(null);
            handleEdit(selectedEmployee);
          }}
        />
      ) : null}

      {showStaffModal && canManageStaff ? (
        <StaffFormModal
          values={formValues}
          options={options}
          editingEmployee={editingEmployee}
          saving={saving}
          error={error}
          message={message}
          isSuperAdmin={isSuperAdmin}
          onChange={setFormValues}
          onClose={resetForm}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

function EmployeeDetailModal({
  employee,
  canManageStaff,
  onClose,
  onEdit,
}: {
  employee: EmployeeListItem;
  canManageStaff: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel wide" role="dialog" aria-modal="true" aria-label="员工详情">
        <div className="modal-header">
          <div className="employee-detail-title">
            <EmployeeAvatar employee={employee} large />
            <div>
              <span>员工详情</span>
              <h3>{employee.full_name}</h3>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="employee-detail-sections">
          <DetailSection title="基础资料">
            <div className="detail-avatar-row">
              <EmployeeAvatar employee={employee} large />
              <Info label="姓名" value={employee.full_name} />
            </div>
            <Info label="昵称" value={employee.nickname} />
            <Info label="电话" value={employee.phone} />
            <Info label="邮箱" value={employee.email} />
            <Info label="生日" value={employee.birthday} />
            <Info label="身份证号码" value={employee.identity_number} />
            <Info label="地址" value={employee.address} />
          </DetailSection>

          <DetailSection title="工作资料">
            <Info label="员工编号" value={employee.employee_code} />
            <Info label="职位" value={employee.job_title?.name} />
            <Info label="状态" value={statusLabels[employee.status]} />
            <Info label="入职日期" value={employee.hire_date} />
            <Info label="正式日期" value={employee.hire_date ? calculateConfirmDate(employee.hire_date) : employee.probation_confirm_date} />
          </DetailSection>

          <DetailSection title="薪资资料">
            <Info label="银行" value={employee.bank_name} />
            <Info label="银行户口" value={employee.bank_account} />
            <Info label="基本薪资" value={formatMoney(employee.base_salary)} />
          </DetailSection>

          <DetailSection title="班次资料">
            <Info label="上班时间" value={formatTime(employee.start_work_time)} />
            <Info label="下班时间" value={formatTime(employee.end_work_time)} />
          </DetailSection>
        </div>

        {canManageStaff ? (
          <div className="row-actions modal-actions-row">
            <button className="primary-button compact-button" type="button" onClick={onEdit}>
              <Edit3 size={16} />
              <span>编辑资料</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StaffFormModalProps = {
  values: EmployeeFormValues;
  options: StaffOptions;
  editingEmployee: EmployeeListItem | null;
  saving: boolean;
  error: string;
  message: string;
  isSuperAdmin: boolean;
  onChange: (values: EmployeeFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function StaffFormModal({
  values,
  options,
  editingEmployee,
  saving,
  error,
  message,
  isSuperAdmin,
  onChange,
  onClose,
  onSubmit,
}: StaffFormModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel wide" role="dialog" aria-modal="true" aria-label="工作人员资料">
        <div className="modal-header">
          <div>
            <span>{editingEmployee ? '编辑资料' : '新增员工'}</span>
            <h3>{editingEmployee ? editingEmployee.full_name : '员工资料'}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <TextField label="姓名" value={values.full_name} onChange={(value) => onChange({ ...values, full_name: value })} required />
            <TextField label="昵称" value={values.nickname} onChange={(value) => onChange({ ...values, nickname: value })} />
            <TextField label="头像 URL" value={values.avatar_url} onChange={(value) => onChange({ ...values, avatar_url: value })} />
            <TextField label="电话" value={values.phone} onChange={(value) => onChange({ ...values, phone: value })} />
            <TextField label="邮箱" type="email" value={values.email} onChange={(value) => onChange({ ...values, email: value })} />
            <TextField label="员工编号" value={values.employee_code} onChange={(value) => onChange({ ...values, employee_code: value })} />
            <TextField label="生日" type="date" value={values.birthday} onChange={(value) => onChange({ ...values, birthday: value })} />
            <TextField label="身份证号" value={values.identity_number} onChange={(value) => onChange({ ...values, identity_number: value })} />
            <TextField label="地址" value={values.address} onChange={(value) => onChange({ ...values, address: value })} />
            <TextField label="银行" value={values.bank_name} onChange={(value) => onChange({ ...values, bank_name: value })} />
            <TextField label="银行户口" value={values.bank_account} onChange={(value) => onChange({ ...values, bank_account: value })} />
            <TextField label="基本薪资" type="number" value={values.base_salary} onChange={(value) => onChange({ ...values, base_salary: value })} />

            <label className="form-field">
              <span>区域</span>
              <select value={values.region_id} onChange={(event) => onChange({ ...values, region_id: event.target.value })}>
                <option value="">未选择</option>
                {options.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>雇佣类型</span>
              <select value={values.employment_type_id} onChange={(event) => onChange({ ...values, employment_type_id: event.target.value })}>
                <option value="">未选择</option>
                {options.employmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>职位</span>
              <select value={values.job_title_id} onChange={(event) => onChange({ ...values, job_title_id: event.target.value })}>
                <option value="">未选择</option>
                {options.jobTitles.map((title) => (
                  <option key={title.id} value={title.id}>
                    {title.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>状态</span>
              <select value={values.status} onChange={(event) => onChange({ ...values, status: event.target.value as EmployeeStatus })}>
                <option value="active">在职</option>
                <option value="inactive">停用</option>
                <option value="left">离职</option>
              </select>
            </label>

            <TextField label="入职日期" type="date" value={values.hire_date} onChange={(value) => onChange({ ...values, hire_date: value })} />
            <ReadOnlyField label="正式日期" value={calculateConfirmDate(values.hire_date)} />
            <TextField label="上班时间" type="time" value={values.start_work_time} onChange={(value) => onChange({ ...values, start_work_time: value })} />
            <TextField label="下班时间" type="time" value={values.end_work_time} onChange={(value) => onChange({ ...values, end_work_time: value })} />

            <label className="form-field checkbox-field">
              <span>是否需要考勤</span>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={values.require_attendance}
                  disabled={!isSuperAdmin}
                  onChange={(event) => onChange({ ...values, require_attendance: event.target.checked })}
                />
                <strong>{values.require_attendance ? '需要考勤' : '不需要考勤'}</strong>
              </label>
            </label>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '保存中...' : editingEmployee ? '保存修改' : '新增员工'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="employee-detail-section">
      <h4>{title}</h4>
      <div className="detail-list">{children}</div>
    </section>
  );
}

function EmployeeAvatar({ employee, large = false }: { employee: EmployeeListItem; large?: boolean }) {
  const initial = employee.full_name.slice(0, 1).toUpperCase();
  return (
    <span className={large ? 'employee-avatar large' : 'employee-avatar'}>
      {employee.avatar_url ? <img src={employee.avatar_url} alt={employee.full_name} /> : initial}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value || '自动计算'} disabled />
    </label>
  );
}

function toFormValues(employee: EmployeeListItem): EmployeeFormValues {
  return {
    full_name: employee.full_name,
    nickname: employee.nickname ?? '',
    avatar_url: employee.avatar_url ?? '',
    phone: employee.phone ?? '',
    email: employee.email ?? '',
    employee_code: employee.employee_code ?? '',
    birthday: employee.birthday ?? '',
    identity_number: employee.identity_number ?? '',
    address: employee.address ?? '',
    bank_name: employee.bank_name ?? '',
    bank_account: employee.bank_account ?? '',
    base_salary: employee.base_salary === null ? '' : String(employee.base_salary),
    region_id: employee.region_id ?? '',
    employment_type_id: employee.employment_type_id ?? '',
    job_title_id: employee.job_title_id ?? '',
    status: employee.status,
    hire_date: employee.hire_date ?? '',
    start_work_time: employee.start_work_time ?? '',
    end_work_time: employee.end_work_time ?? '',
    require_attendance: employee.require_attendance,
  };
}

function calculateConfirmDate(hireDate: string) {
  if (!hireDate) return '';
  const date = new Date(`${hireDate}T00:00:00`);
  date.setMonth(date.getMonth() + 3);
  return toDateKey(date);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '-';
}

function formatMoney(value: number | null) {
  return value === null ? '-' : `RM ${value.toFixed(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return '未知错误';
}
