import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  EmployeeFormValues,
  EmployeeListItem,
  StaffOptions,
  staffService,
} from '../services/staff.service';
import type { EmployeeStatus } from '../types/database';

const emptyForm: EmployeeFormValues = {
  full_name: '',
  phone: '',
  email: '',
  employee_code: '',
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
  const [options, setOptions] = useState<StaffOptions>({
    regions: [],
    employmentTypes: [],
    jobTitles: [],
  });
  const [formValues, setFormValues] = useState<EmployeeFormValues>(emptyForm);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredEmployees = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return employees;
    }

    return employees.filter((employee) => {
      return [
        employee.full_name,
        employee.phone,
        employee.email,
        employee.employee_code,
        employee.job_title?.name,
        employee.region?.code,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword));
    });
  }, [employees, searchTerm]);

  useEffect(() => {
    loadStaffData();
  }, []);

  async function loadStaffData() {
    setLoading(true);
    setError('');

    try {
      const [employeeList, optionList] = await Promise.all([
        staffService.listEmployees(),
        staffService.getOptions(),
      ]);

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

  function handleEdit(employee: EmployeeListItem) {
    setEditingEmployee(employee);
    setMessage('');
    setError('');
    setFormValues({
      full_name: employee.full_name,
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      employee_code: employee.employee_code ?? '',
      region_id: employee.region_id ?? '',
      employment_type_id: employee.employment_type_id ?? '',
      job_title_id: employee.job_title_id ?? '',
      status: employee.status,
      hire_date: employee.hire_date ?? '',
      start_work_time: employee.start_work_time ?? '',
      end_work_time: employee.end_work_time ?? '',
      require_attendance: employee.require_attendance,
    });
  }

  async function handleDelete(employee: EmployeeListItem) {
    if (!isSuperAdmin) {
      setError('只有 Super Admin 可以删除工作人员。');
      return;
    }

    const confirmed = window.confirm(`确认删除 ${employee.full_name}？该操作会采用软删除，不会直接移除数据库记录。`);

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await staffService.softDeleteEmployee(employee.id);
      setMessage('工作人员已删除。');
      await loadStaffData();
    } catch (deleteError) {
      setError(`删除工作人员失败：${getErrorMessage(deleteError)}`);
    }
  }

  function resetForm() {
    setEditingEmployee(null);
    setFormValues(emptyForm);
  }

  return (
    <section className="staff-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>工作人员管理</span>
          <h2>工作人员</h2>
          <p>维护员工基础资料、职位、区域、工作时间与考勤规则。</p>
        </div>

        <button className="secondary-action" type="button" onClick={loadStaffData} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="staff-grid">
        {canManageStaff ? (
        <form className="staff-form-panel" onSubmit={handleSubmit}>
          <div className="panel-title-row">
            <div>
              <span>{editingEmployee ? '编辑资料' : '新增员工'}</span>
              <h3>{editingEmployee ? editingEmployee.full_name : '员工资料'}</h3>
            </div>
            {editingEmployee ? (
              <button className="icon-button" type="button" onClick={resetForm} aria-label="取消编辑">
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>姓名</span>
              <input
                value={formValues.full_name}
                onChange={(event) => setFormValues({ ...formValues, full_name: event.target.value })}
                required
              />
            </label>

            <label className="form-field">
              <span>电话</span>
              <input
                value={formValues.phone}
                onChange={(event) => setFormValues({ ...formValues, phone: event.target.value })}
              />
            </label>

            <label className="form-field">
              <span>邮箱</span>
              <input
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues({ ...formValues, email: event.target.value })}
              />
            </label>

            <label className="form-field">
              <span>员工编号</span>
              <input
                value={formValues.employee_code}
                onChange={(event) => setFormValues({ ...formValues, employee_code: event.target.value })}
              />
            </label>

            <label className="form-field">
              <span>区域</span>
              <select
                value={formValues.region_id}
                onChange={(event) => setFormValues({ ...formValues, region_id: event.target.value })}
              >
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
              <select
                value={formValues.employment_type_id}
                onChange={(event) => setFormValues({ ...formValues, employment_type_id: event.target.value })}
              >
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
              <select
                value={formValues.job_title_id}
                onChange={(event) => setFormValues({ ...formValues, job_title_id: event.target.value })}
              >
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
              <select
                value={formValues.status}
                onChange={(event) =>
                  setFormValues({ ...formValues, status: event.target.value as EmployeeStatus })
                }
              >
                <option value="active">在职</option>
                <option value="inactive">停用</option>
                <option value="left">离职</option>
              </select>
            </label>

            <label className="form-field">
              <span>入职日期</span>
              <input
                type="date"
                value={formValues.hire_date}
                onChange={(event) => setFormValues({ ...formValues, hire_date: event.target.value })}
              />
            </label>

            <label className="form-field">
              <span>上班时间</span>
              <input
                type="time"
                value={formValues.start_work_time}
                onChange={(event) => setFormValues({ ...formValues, start_work_time: event.target.value })}
              />
            </label>

            <label className="form-field">
              <span>下班时间</span>
              <input
                type="time"
                value={formValues.end_work_time}
                onChange={(event) => setFormValues({ ...formValues, end_work_time: event.target.value })}
              />
            </label>

            <label className="form-field checkbox-field">
              <span>是否需要考勤</span>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={formValues.require_attendance}
                  disabled={!isSuperAdmin}
                  onChange={(event) =>
                    setFormValues({ ...formValues, require_attendance: event.target.checked })
                  }
                />
                <strong>{formValues.require_attendance ? '需要考勤' : '不需要考勤'}</strong>
              </label>
            </label>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '保存中' : editingEmployee ? '保存修改' : '新增员工'}</span>
          </button>
        </form>
        ) : (
          <div className="staff-form-panel">
            <div className="panel-title-row">
              <div>
                <span>个人资料</span>
                <h3>仅可查看</h3>
              </div>
            </div>
            <p className="form-helper">区域、职称、雇佣类型、入职日期、工作时间与考勤规则由公司管理。</p>
          </div>
        )}

        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>员工列表</span>
              <h3>{filteredEmployees.length} 位工作人员</h3>
            </div>

            <label className="table-search">
              <Search size={16} />
              <input
                placeholder="搜索姓名、电话、职位"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="table-state">正在读取工作人员...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="table-state">暂无工作人员资料。</div>
          ) : (
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>电话</th>
                    <th>职位</th>
                    <th>区域</th>
                    <th>上班</th>
                    <th>下班</th>
                    <th>考勤</th>
                    <th>状态</th>
                    {canManageStaff ? <th>操作</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.full_name}</strong>
                        {employee.employee_code ? <span>{employee.employee_code}</span> : null}
                      </td>
                      <td>{employee.phone || '-'}</td>
                      <td>{employee.job_title?.name || '-'}</td>
                      <td>{employee.region?.code || '-'}</td>
                      <td>{employee.start_work_time ? employee.start_work_time.slice(0, 5) : '-'}</td>
                      <td>{employee.end_work_time ? employee.end_work_time.slice(0, 5) : '-'}</td>
                      <td>{employee.require_attendance ? '需要' : '不需要'}</td>
                      <td>
                        <span className={`status-pill status-${employee.status}`}>
                          {statusLabels[employee.status]}
                        </span>
                      </td>
                      {canManageStaff ? (
                        <td>
                          <div className="row-actions">
                            <button className="icon-button" type="button" onClick={() => handleEdit(employee)} aria-label="编辑">
                              <Edit3 size={16} />
                            </button>
                            {isSuperAdmin ? (
                              <button
                                className="icon-button danger-button"
                                type="button"
                                onClick={() => handleDelete(employee)}
                                aria-label="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return '未知错误';
}
