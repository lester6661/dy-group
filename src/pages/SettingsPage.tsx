import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Edit3, Plus, RefreshCw, Settings2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { SystemModal } from '../components/SystemModal';
import { type SettingsFormValues, type SettingsModuleKey, type SettingsRecord, settingsService } from '../services/settings.service';
import { type EmployeeListItem, type StaffOptions, staffService } from '../services/staff.service';
import { menuItems } from '../routes/menu';

type SettingsModule = {
  key: SettingsModuleKey | 'permissions';
  title: string;
  description: string;
  nameLabel: string;
  hasCode?: boolean;
};

const modules: SettingsModule[] = [
  {
    key: 'regions',
    title: '区域管理',
    description: '管理古晋、吉隆坡等运营区域。',
    nameLabel: '区域名称',
    hasCode: true,
  },
  {
    key: 'job_titles',
    title: '职称管理',
    description: '维护员工职位与组织称谓。',
    nameLabel: '职称名称',
  },
  {
    key: 'employment_types',
    title: '雇佣类型管理',
    description: '维护全职、兼职、自由业者等雇佣类型。',
    nameLabel: '类型名称',
  },
  {
    key: 'permissions',
    title: '权限管理',
    description: '此模块将在员工资料与组织架构稳定后开放。',
    nameLabel: '权限名称',
  },
];

const emptyForm: SettingsFormValues = {
  code: '',
  name: '',
  company_english_name: '',
  company_registration_no: '',
  company_instagram: '',
  company_facebook: '',
  sort_order: 0,
  is_active: true,
};

type PermissionAccess = {
  view: boolean;
  use: boolean;
};

type PermissionState = Record<string, PermissionAccess>;

type PermissionItem = {
  key: string;
  name: string;
  parentKey: string | null;
  level: number;
  disabled?: boolean;
};

type PermissionModalTarget =
  | { type: 'jobTitle'; title: string; subtitle: string }
  | { type: 'special'; title: string; subtitle: string }
  | { type: 'employee'; employee: EmployeeListItem };

const defaultSpecialPermissionNames = ['???', '?????'];
const employeeStatusLabels: Record<string, string> = {
  active: '??',
  probation: '???',
  inactive: '??',
  suspended: '??',
  left: '??',
};
const employeeStatusOrder: Record<string, number> = {
  active: 0,
  probation: 1,
  inactive: 2,
  suspended: 2,
  left: 3,
};
const reservedPermissionKeys = new Set(['settings']);

export function SettingsPage() {
  const [activeModuleKey, setActiveModuleKey] = useState<SettingsModule['key']>('regions');
  const [records, setRecords] = useState<SettingsRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<SettingsRecord | null>(null);
  const [formValues, setFormValues] = useState<SettingsFormValues>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeModule = useMemo(
    () => modules.find((moduleItem) => moduleItem.key === activeModuleKey) ?? modules[0],
    [activeModuleKey],
  );
  const isPermissionModule = activeModuleKey === 'permissions';

  useEffect(() => {
    if (activeModuleKey !== 'permissions') {
      void loadSettings(activeModuleKey);
    } else {
      setRecords([]);
      setLoading(false);
      setError('');
    }
  }, [activeModuleKey]);

  async function loadSettings(moduleKey = activeModuleKey) {
    if (moduleKey === 'permissions') {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const settings = await settingsService.listSettings(moduleKey);
      setRecords(settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取系统设置失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeModuleKey === 'permissions') {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingRecord) {
        await settingsService.updateSetting(activeModuleKey, editingRecord.id, formValues);
        setMessage('设置已更新。');
      } else {
        await settingsService.createSetting(activeModuleKey, formValues);
        setMessage('设置已新增。');
      }

      closeForm();
      await loadSettings(activeModuleKey);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存系统设置失败。');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(record: SettingsRecord) {
    if (activeModuleKey === 'permissions') {
      return;
    }

    setError('');
    setMessage('');

    try {
      await settingsService.toggleSetting(activeModuleKey, record.id, !record.is_active);
      setMessage(record.is_active ? '已停用。' : '已启用。');
      await loadSettings(activeModuleKey);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : '更新启用状态失败。');
    }
  }

  function openCreate() {
    setEditingRecord(null);
    setFormValues(emptyForm);
    setFormOpen(true);
    setMessage('');
    setError('');
  }

  function handleEdit(record: SettingsRecord) {
    setEditingRecord(record);
    setMessage('');
    setError('');
    setFormValues({
      code: 'code' in record ? record.code : '',
      name: record.name,
      company_english_name: 'company_english_name' in record ? record.company_english_name ?? '' : '',
      company_registration_no: 'company_registration_no' in record ? record.company_registration_no ?? '' : '',
      company_instagram: 'company_instagram' in record ? record.company_instagram ?? '' : '',
      company_facebook: 'company_facebook' in record ? record.company_facebook ?? '' : '',
      sort_order: record.sort_order,
      is_active: record.is_active,
    });
    setFormOpen(true);
  }

  function handleModuleChange(moduleKey: SettingsModule['key']) {
    setActiveModuleKey(moduleKey);
    closeForm();
  }

  function closeForm() {
    setEditingRecord(null);
    setFormValues(emptyForm);
    setFormOpen(false);
  }

  return (
    <section className="settings-page">
      {error ? <p className="form-alert">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="settings-tabs" role="tablist" aria-label="系统设置模块">
        {modules.map((moduleItem) => (
          <button
            key={moduleItem.key}
            className={activeModuleKey === moduleItem.key ? 'settings-tab active' : 'settings-tab'}
            type="button"
            onClick={() => handleModuleChange(moduleItem.key)}
          >
            <Settings2 size={17} />
            <span>{moduleItem.title}</span>
          </button>
        ))}
      </div>

      {isPermissionModule ? (
        <PermissionManagementPanel />
      ) : (
        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>{activeModule.title}</span>
              <h3>{records.length} 条设置</h3>
            </div>
            <div className="toolbar-actions">
              <button className="secondary-action" type="button" onClick={openCreate}>
                <Plus size={17} />
                <span>{getCreateButtonText(activeModule.key)}</span>
              </button>
              <button className="secondary-action" type="button" onClick={() => loadSettings()} disabled={loading}>
                <RefreshCw size={17} />
                <span>刷新</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="table-state">正在读取系统设置...</div>
          ) : records.length === 0 ? (
            <div className="table-state">暂无系统设置。</div>
          ) : (
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    {activeModule.hasCode ? <th>代码</th> : null}
                    <th>名称</th>
                    {activeModule.key === 'regions' ? <th>公司英文名称</th> : null}
                    {activeModule.key === 'regions' ? <th>公司注册号</th> : null}
                    {activeModule.key === 'regions' ? <th>公司 IG</th> : null}
                    {activeModule.key === 'regions' ? <th>公司 FB</th> : null}
                    <th>排序</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      {activeModule.hasCode ? <td>{'code' in record ? record.code : '-'}</td> : null}
                      <td>
                        <strong>{record.name}</strong>
                      </td>
                      {activeModule.key === 'regions' ? <td>{'company_english_name' in record ? record.company_english_name || '-' : '-'}</td> : null}
                      {activeModule.key === 'regions' ? <td>{'company_registration_no' in record ? record.company_registration_no || '-' : '-'}</td> : null}
                      {activeModule.key === 'regions' ? <td>{'company_instagram' in record ? record.company_instagram || '-' : '-'}</td> : null}
                      {activeModule.key === 'regions' ? <td>{'company_facebook' in record ? record.company_facebook || '-' : '-'}</td> : null}
                      <td>{record.sort_order}</td>
                      <td>
                        <span className={record.is_active ? 'status-pill status-active' : 'status-pill status-inactive'}>
                          {record.is_active ? '启用' : '停用'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" type="button" onClick={() => handleEdit(record)} aria-label="编辑">
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => handleToggle(record)}
                            aria-label={record.is_active ? '停用' : '启用'}
                          >
                            {record.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {formOpen && !isPermissionModule ? (
        <SettingsFormModal
          activeModule={activeModule}
          editingRecord={editingRecord}
          formValues={formValues}
          saving={saving}
          onChange={setFormValues}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

function SettingsFormModal({
  activeModule,
  editingRecord,
  formValues,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  activeModule: SettingsModule;
  editingRecord: SettingsRecord | null;
  formValues: SettingsFormValues;
  saving: boolean;
  onChange: (values: SettingsFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SystemModal
      title={editingRecord ? `编辑${getSettingName(activeModule.key)}` : `新增${getSettingName(activeModule.key)}`}
      subtitle={activeModule.title}
      ariaLabel={editingRecord ? '编辑系统设置' : '新增系统设置'}
      wide={false}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button compact-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button compact-button" type="submit" form="settings-form" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '保存中...' : '保存'}</span>
          </button>
        </>
      }
    >
      <form id="settings-form" onSubmit={onSubmit}>
        <div className="form-grid single">
          {activeModule.hasCode ? (
            <label className="form-field">
              <span>区域代码</span>
              <input
                value={formValues.code}
                onChange={(event) => onChange({ ...formValues, code: event.target.value })}
                placeholder="例如 KCH"
                required
              />
            </label>
          ) : null}

          <label className="form-field">
            <span>{activeModule.nameLabel}</span>
            <input value={formValues.name} onChange={(event) => onChange({ ...formValues, name: event.target.value })} required />
          </label>

          {activeModule.key === 'regions' ? (
            <>
              <label className="form-field">
                <span>公司英文名称</span>
                <input
                  value={formValues.company_english_name ?? ''}
                  onChange={(event) => onChange({ ...formValues, company_english_name: event.target.value })}
                  placeholder="例如 DY ENTERTAINMENT SDN BHD"
                />
              </label>

              <label className="form-field">
                <span>公司注册号</span>
                <input
                  value={formValues.company_registration_no ?? ''}
                  onChange={(event) => onChange({ ...formValues, company_registration_no: event.target.value })}
                  placeholder="例如 202401047280 (1593126-M)"
                />
              </label>

              <label className="form-field">
                <span>公司 IG</span>
                <input
                  value={formValues.company_instagram ?? ''}
                  onChange={(event) => onChange({ ...formValues, company_instagram: event.target.value })}
                  placeholder="例如 @dygroup"
                />
              </label>

              <label className="form-field">
                <span>公司 FB</span>
                <input
                  value={formValues.company_facebook ?? ''}
                  onChange={(event) => onChange({ ...formValues, company_facebook: event.target.value })}
                  placeholder="例如 DY Group"
                />
              </label>
            </>
          ) : null}

          <label className="form-field">
            <span>排序</span>
            <input
              type="number"
              value={formValues.sort_order}
              onChange={(event) => onChange({ ...formValues, sort_order: Number(event.target.value) })}
            />
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              checked={formValues.is_active}
              onChange={(event) => onChange({ ...formValues, is_active: event.target.checked })}
            />
            <span>启用</span>
          </label>
        </div>
      </form>
    </SystemModal>
  );
}

function PermissionManagementPanel() {
  const [activeTab, setActiveTab] = useState<'jobTitles' | 'special' | 'employees'>('jobTitles');
  const [jobTitles, setJobTitles] = useState<SettingsRecord[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOptions>({ regions: [], employmentTypes: [], jobTitles: [] });
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [specialPermissions, setSpecialPermissions] = useState(defaultSpecialPermissionNames);
  const [modalTarget, setModalTarget] = useState<PermissionModalTarget | null>(null);
  const [modalPermissions, setModalPermissions] = useState<PermissionState>({});
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [managedRegionIds, setManagedRegionIds] = useState<string[]>([]);
  const [ownedSpecialPermissions, setOwnedSpecialPermissions] = useState<string[]>([]);
  const [newSpecialName, setNewSpecialName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const permissionItems = useMemo(() => buildPermissionItems(), []);
  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((first, second) => {
        const firstStatus = employeeStatusOrder[getStaffStatus(first.status)] ?? employeeStatusOrder.active;
        const secondStatus = employeeStatusOrder[getStaffStatus(second.status)] ?? employeeStatusOrder.active;
        if (firstStatus !== secondStatus) return firstStatus - secondStatus;
        return first.full_name.localeCompare(second.full_name, 'zh-Hans');
      }),
    [employees],
  );

  useEffect(() => {
    void loadPermissionContext();
  }, []);

  async function loadPermissionContext() {
    setLoading(true);
    setError('');

    try {
      const [jobTitleRecords, staffList, options] = await Promise.all([
        settingsService.listSettings('job_titles'),
        staffService.listEmployees(),
        staffService.getOptions(),
      ]);
      setJobTitles(jobTitleRecords);
      setEmployees(staffList);
      setStaffOptions(options);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '???????????');
    } finally {
      setLoading(false);
    }
  }

  function openPermissionModal(target: PermissionModalTarget) {
    setModalTarget(target);
    setModalPermissions(createDefaultPermissionState(permissionItems, target));
    setNewSpecialName('');

    if (target.type === 'employee') {
      setAttendanceRequired(target.employee.require_attendance ?? true);
      setManagedRegionIds(target.employee.region_id ? [target.employee.region_id] : []);
      setOwnedSpecialPermissions([]);
    } else {
      setAttendanceRequired(true);
      setManagedRegionIds([]);
      setOwnedSpecialPermissions([]);
    }
  }

  function closePermissionModal() {
    setModalTarget(null);
    setModalPermissions({});
    setNewSpecialName('');
  }

  function handleSaveSpecialPermission() {
    const trimmedName = newSpecialName.trim();
    if (modalTarget?.type === 'special' && modalTarget.title === '??????' && trimmedName && !specialPermissions.includes(trimmedName)) {
      setSpecialPermissions((current) => [...current, trimmedName]);
    }

    closePermissionModal();
  }

  function handlePermissionChange(permissionKey: string, field: keyof PermissionAccess, checked: boolean) {
    setModalPermissions((current) => updatePermissionTree(current, permissionItems, permissionKey, field, checked));
  }

  function toggleManagedRegion(regionId: string, checked: boolean) {
    setManagedRegionIds((current) => (checked ? [...new Set([...current, regionId])] : current.filter((id) => id !== regionId)));
  }

  function toggleSpecialPermission(name: string, checked: boolean) {
    setOwnedSpecialPermissions((current) => (checked ? [...new Set([...current, name])] : current.filter((item) => item !== name)));
  }

  return (
    <div className="permission-management-panel">
      {error ? <p className="form-alert">{error}</p> : null}

      <div className="permission-subtabs" role="tablist" aria-label="??????">
        <button className={activeTab === 'jobTitles' ? 'permission-subtab active' : 'permission-subtab'} type="button" onClick={() => setActiveTab('jobTitles')}>
          ????
        </button>
        <button className={activeTab === 'special' ? 'permission-subtab active' : 'permission-subtab'} type="button" onClick={() => setActiveTab('special')}>
          ????
        </button>
        <button className={activeTab === 'employees' ? 'permission-subtab active' : 'permission-subtab'} type="button" onClick={() => setActiveTab('employees')}>
          ??????
        </button>
      </div>

      {activeTab === 'jobTitles' ? (
        <section className="permission-section-panel">
          <div className="list-header">
            <div>
              <span>????</span>
              <h3>{jobTitles.length} ???</h3>
            </div>
            <ShieldCheck size={22} />
          </div>
          {loading ? (
            <div className="table-state">????????...</div>
          ) : (
            <div className="permission-card-grid compact">
              {jobTitles.map((jobTitle) => (
                <button
                  className="permission-template-card"
                  type="button"
                  key={jobTitle.id}
                  onClick={() => openPermissionModal({ type: 'jobTitle', title: jobTitle.name, subtitle: '??????' })}
                >
                  <strong>{jobTitle.name}</strong>
                  <span>??????</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'special' ? (
        <section className="permission-section-panel">
          <div className="list-header">
            <div>
              <span>????</span>
              <h3>???????????</h3>
            </div>
            <button
              className="secondary-action"
              type="button"
              onClick={() => openPermissionModal({ type: 'special', title: '??????', subtitle: '??????' })}
            >
              <Plus size={17} />
              <span>??????</span>
            </button>
          </div>
          <div className="permission-card-grid compact">
            {specialPermissions.map((permissionName) => (
              <button
                className="permission-template-card"
                type="button"
                key={permissionName}
                onClick={() => openPermissionModal({ type: 'special', title: permissionName, subtitle: '??????' })}
              >
                <strong>{permissionName}</strong>
                <span>??????</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'employees' ? (
        <section className="permission-section-panel">
          <div className="list-header">
            <div>
              <span>??????</span>
              <h3>{sortedEmployees.length} ???</h3>
            </div>
            <button className="secondary-action" type="button" onClick={loadPermissionContext} disabled={loading}>
              <RefreshCw size={17} />
              <span>??</span>
            </button>
          </div>
          {loading ? (
            <div className="table-state">????????...</div>
          ) : sortedEmployees.length === 0 ? (
            <div className="table-state">?????????</div>
          ) : (
            <div className="staff-table-wrap">
              <table className="staff-table staff-simple-table">
                <thead>
                  <tr>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>????</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((employee) => {
                    const status = getStaffStatus(employee.status);
                    return (
                      <tr key={employee.id}>
                        <td>
                          <span className={'status-pill status-' + status}>{employeeStatusLabels[status] ?? employeeStatusLabels.active}</span>
                        </td>
                        <td>
                          <PermissionEmployeeAvatar employee={employee} />
                        </td>
                        <td>
                          <button className="text-link-button" type="button" onClick={() => openPermissionModal({ type: 'employee', employee })}>
                            {employee.full_name}
                          </button>
                        </td>
                        <td>{employee.nickname || '-'}</td>
                        <td>{employee.job_title?.name || '-'}</td>
                        <td>{employee.employment_type?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {modalTarget ? (
        <SystemModal
          title={modalTarget.type === 'employee' ? modalTarget.employee.full_name : modalTarget.title}
          subtitle={modalTarget.type === 'employee' ? '????' : modalTarget.subtitle}
          ariaLabel="????"
          wide
          onClose={closePermissionModal}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={closePermissionModal}>
                ??
              </button>
              <button className="primary-button compact-button" type="button" onClick={modalTarget.type === 'special' ? handleSaveSpecialPermission : closePermissionModal}>
                ????
              </button>
            </>
          }
        >
          {modalTarget.type === 'special' && modalTarget.title === '??????' ? (
            <label className="form-field permission-name-field">
              <span>??????</span>
              <input value={newSpecialName} onChange={(event) => setNewSpecialName(event.target.value)} placeholder="???????" />
            </label>
          ) : null}

          {modalTarget.type === 'employee' ? (
            <div className="employee-permission-sections">
              <PermissionBlock title="????">
                <div className="segmented-choice">
                  <button className={attendanceRequired ? 'active' : ''} type="button" onClick={() => setAttendanceRequired(true)}>
                    ??
                  </button>
                  <button className={!attendanceRequired ? 'active' : ''} type="button" onClick={() => setAttendanceRequired(false)}>
                    ???
                  </button>
                </div>
              </PermissionBlock>

              <PermissionBlock title="????">
                <div className="permission-check-grid">
                  {staffOptions.regions.map((region) => (
                    <label className="permission-check" key={region.id}>
                      <input checked={managedRegionIds.includes(region.id)} type="checkbox" onChange={(event) => toggleManagedRegion(region.id, event.target.checked)} />
                      <span>{region.code}</span>
                    </label>
                  ))}
                </div>
              </PermissionBlock>

              <PermissionBlock title="??????">
                <div className="permission-check-grid">
                  {specialPermissions.map((permissionName) => (
                    <label className="permission-check" key={permissionName}>
                      <input
                        checked={ownedSpecialPermissions.includes(permissionName)}
                        type="checkbox"
                        onChange={(event) => toggleSpecialPermission(permissionName, event.target.checked)}
                      />
                      <span>{permissionName}</span>
                    </label>
                  ))}
                </div>
              </PermissionBlock>
            </div>
          ) : null}

          <PermissionBlock title={modalTarget.type === 'employee' ? '??????' : '????'}>
            <PermissionMatrix items={permissionItems} permissions={modalPermissions} onChange={handlePermissionChange} />
          </PermissionBlock>
        </SystemModal>
      ) : null}
    </div>
  );
}

function PermissionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="permission-block">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function PermissionMatrix({
  items,
  permissions,
  onChange,
}: {
  items: PermissionItem[];
  permissions: PermissionState;
  onChange: (permissionKey: string, field: keyof PermissionAccess, checked: boolean) => void;
}) {
  return (
    <div className="permission-matrix">
      <div className="permission-matrix-head">
        <span>????</span>
        <span>??</span>
        <span>??</span>
      </div>
      {items.map((item) => {
        const access = permissions[item.key] ?? { view: false, use: false };
        const viewState = getPermissionCheckState(item, items, permissions, 'view');
        const useStateValue = getPermissionCheckState(item, items, permissions, 'use');

        return (
          <div className={'permission-matrix-row level-' + item.level} key={item.key}>
            <span>{item.name}</span>
            <IndeterminateCheckbox
              checked={access.view}
              indeterminate={viewState === 'mixed'}
              disabled={item.disabled}
              onChange={(checked) => onChange(item.key, 'view', checked)}
            />
            <IndeterminateCheckbox
              checked={access.use}
              indeterminate={useStateValue === 'mixed'}
              disabled={item.disabled || !access.view}
              onChange={(checked) => onChange(item.key, 'use', checked)}
            />
          </div>
        );
      })}
    </div>
  );
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return <input ref={checkboxRef} checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />;
}

function PermissionEmployeeAvatar({ employee }: { employee: EmployeeListItem }) {
  const initial = employee.full_name.slice(0, 1).toUpperCase();
  return (
    <span className="employee-avatar">
      {employee.avatar_url ? <img src={employee.avatar_url} alt={employee.full_name} /> : initial}
    </span>
  );
}

function buildPermissionItems(): PermissionItem[] {
  const groups = new Map<string, PermissionItem[]>();

  menuItems.forEach((item) => {
    if (reservedPermissionKeys.has(item.key) || !item.section || !item.group) return;
    const currentItems = groups.get(item.group) ?? [];
    currentItems.push({ key: item.key, name: item.label, parentKey: item.group, level: 1, disabled: item.disabled });
    groups.set(item.group, currentItems);
  });

  return Array.from(groups.entries()).flatMap(([groupName, children]) => [
    { key: groupName, name: groupName, parentKey: null, level: 0 },
    ...children,
  ]);
}

function createDefaultPermissionState(items: PermissionItem[], target: PermissionModalTarget): PermissionState {
  const permissions = items.reduce<PermissionState>((state, item) => {
    state[item.key] = { view: false, use: false };
    return state;
  }, {});
  const targetName = target.type === 'employee' ? target.employee.job_title?.name ?? '' : target.title;
  const defaultKeys = getDefaultPermissionKeys(targetName);

  defaultKeys.forEach((key) => {
    if (permissions[key]) {
      permissions[key] = { view: true, use: true };
    }
  });

  items
    .filter((item) => item.parentKey && defaultKeys.includes(item.parentKey))
    .forEach((item) => {
      permissions[item.key] = { view: true, use: true };
    });

  return permissions;
}

function getDefaultPermissionKeys(name: string) {
  if (name.includes('HR')) return ['???', 'staff', 'registration-review', 'leave-review', 'attendance-management'];
  if (name.includes('?????')) return ['??', '???', '??', '???'];
  if (name.includes('???')) return ['??', '???', '??', '???'];
  if (name.includes('??')) return ['???', 'agent'];
  if (name.includes('??')) return ['??', 'designer'];
  if (name.includes('??')) return ['??', 'scout'];
  return [];
}

function updatePermissionTree(state: PermissionState, items: PermissionItem[], key: string, field: keyof PermissionAccess, checked: boolean): PermissionState {
  const next = { ...state };
  const targetItem = items.find((item) => item.key === key);
  const childItems = items.filter((item) => item.parentKey === key);
  const affectedItems = targetItem?.parentKey ? [targetItem] : [targetItem, ...childItems].filter(Boolean);

  affectedItems.forEach((item) => {
    if (!item) return;
    const current = next[item.key] ?? { view: false, use: false };
    const updated = { ...current, [field]: checked };
    if (field === 'view' && !checked) updated.use = false;
    if (field === 'use' && checked) updated.view = true;
    next[item.key] = updated;
  });

  if (targetItem?.parentKey) {
    syncParentPermission(next, items, targetItem.parentKey, field);
  }

  return next;
}

function syncParentPermission(state: PermissionState, items: PermissionItem[], parentKey: string, field: keyof PermissionAccess) {
  const childItems = items.filter((item) => item.parentKey === parentKey);
  const hasAnyChecked = childItems.some((item) => state[item.key]?.[field]);
  const hasAllChecked = childItems.length > 0 && childItems.every((item) => state[item.key]?.[field]);
  const parent = state[parentKey] ?? { view: false, use: false };

  state[parentKey] = { ...parent, [field]: hasAllChecked };
  if (!hasAnyChecked && field === 'view') {
    state[parentKey].use = false;
  }
}

function getPermissionCheckState(item: PermissionItem, items: PermissionItem[], permissions: PermissionState, field: keyof PermissionAccess) {
  const children = items.filter((child) => child.parentKey === item.key);
  if (children.length === 0) return permissions[item.key]?.[field] ? 'checked' : 'unchecked';

  const checkedCount = children.filter((child) => permissions[child.key]?.[field]).length;
  if (checkedCount === 0) return permissions[item.key]?.[field] ? 'checked' : 'unchecked';
  if (checkedCount === children.length) return 'checked';
  return 'mixed';
}

function getStaffStatus(status: string | null | undefined) {
  return status || 'active';
}

function getSettingName(moduleKey: SettingsModule['key']) {
  if (moduleKey === 'regions') return '区域';
  if (moduleKey === 'job_titles') return '职称';
  if (moduleKey === 'employment_types') return '雇佣类型';
  return '权限';
}

function getCreateButtonText(moduleKey: SettingsModule['key']) {
  return `新增${getSettingName(moduleKey)}`;
}
