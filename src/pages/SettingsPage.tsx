import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, RefreshCw, Settings2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { SystemModal } from '../components/SystemModal';
import { type SettingsFormValues, type SettingsModuleKey, type SettingsRecord, settingsService } from '../services/settings.service';

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
  sort_order: 0,
  is_active: true,
};

const permissionCards = ['角色管理', '资料权限', '审核权限', '系统权限'];

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
  return (
    <div className="staff-list-panel">
      <div className="list-header">
        <div>
          <span>权限管理</span>
          <h3>当前版本仅保留页面入口</h3>
        </div>
        <ShieldCheck size={22} />
      </div>

      <div className="permission-placeholder">
        <p>此模块将在员工资料与组织架构稳定后开放。</p>
        <p>当前版本仅保留页面入口。</p>

        <div className="permission-card-grid">
          {permissionCards.map((card) => (
            <article className="permission-card" key={card}>
              <strong>{card}</strong>
              <span>开发中</span>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
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
