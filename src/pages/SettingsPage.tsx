import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import {
  SettingsFormValues,
  SettingsModuleKey,
  SettingsRecord,
  settingsService,
} from '../services/settings.service';

type SettingsModule = {
  key: SettingsModuleKey;
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
];

const emptyForm: SettingsFormValues = {
  code: '',
  name: '',
  sort_order: 0,
  is_active: true,
};

export function SettingsPage() {
  const [activeModuleKey, setActiveModuleKey] = useState<SettingsModuleKey>('regions');
  const [records, setRecords] = useState<SettingsRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<SettingsRecord | null>(null);
  const [formValues, setFormValues] = useState<SettingsFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeModule = useMemo(
    () => modules.find((moduleItem) => moduleItem.key === activeModuleKey) ?? modules[0],
    [activeModuleKey],
  );

  useEffect(() => {
    loadSettings(activeModuleKey);
  }, [activeModuleKey]);

  async function loadSettings(moduleKey = activeModuleKey) {
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

      resetForm();
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存系统设置失败。');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(record: SettingsRecord) {
    setError('');
    setMessage('');

    try {
      await settingsService.toggleSetting(activeModuleKey, record.id, !record.is_active);
      setMessage(record.is_active ? '已停用。' : '已启用。');
      await loadSettings();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : '更新启用状态失败。');
    }
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
  }

  function handleModuleChange(moduleKey: SettingsModuleKey) {
    setActiveModuleKey(moduleKey);
    resetForm();
  }

  function resetForm() {
    setEditingRecord(null);
    setFormValues(emptyForm);
  }

  return (
    <section className="settings-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>系统设置</span>
          <h2>基础资料管理</h2>
          <p>维护区域、职称与雇佣类型，供工作人员和后续业务模块使用。</p>
        </div>

        <button className="secondary-action" type="button" onClick={() => loadSettings()} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

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

      <div className="staff-grid">
        <form className="staff-form-panel" onSubmit={handleSubmit}>
          <div className="panel-title-row">
            <div>
              <span>{editingRecord ? '编辑设置' : '新增设置'}</span>
              <h3>{activeModule.title}</h3>
            </div>
            {editingRecord ? (
              <button className="icon-button" type="button" onClick={resetForm} aria-label="取消编辑">
                <X size={18} />
              </button>
            ) : null}
          </div>

          <p className="panel-description">{activeModule.description}</p>

          <div className="form-grid single">
            {activeModule.hasCode ? (
              <label className="form-field">
                <span>区域代码</span>
                <input
                  value={formValues.code}
                  onChange={(event) => setFormValues({ ...formValues, code: event.target.value })}
                  placeholder="例如 KCH"
                  required
                />
              </label>
            ) : null}

            <label className="form-field">
              <span>{activeModule.nameLabel}</span>
              <input
                value={formValues.name}
                onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
                required
              />
            </label>

            <label className="form-field">
              <span>排序</span>
              <input
                type="number"
                value={formValues.sort_order}
                onChange={(event) =>
                  setFormValues({ ...formValues, sort_order: Number(event.target.value) })
                }
              />
            </label>

            <label className="toggle-field">
              <input
                type="checkbox"
                checked={formValues.is_active}
                onChange={(event) => setFormValues({ ...formValues, is_active: event.target.checked })}
              />
              <span>启用</span>
            </label>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '保存中' : editingRecord ? '保存修改' : '新增'}</span>
          </button>
        </form>

        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>{activeModule.title}</span>
              <h3>{records.length} 条设置</h3>
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
      </div>
    </section>
  );
}
