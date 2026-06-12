import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { SystemModal } from '../components/SystemModal';
import { profileService, type MyProfileData } from '../services/profile.service';

type ProfileForm = {
  full_name: string;
  phone: string;
  avatar_url: string | null;
};

export function ProfilePage() {
  const [profileData, setProfileData] = useState<MyProfileData | null>(null);
  const [form, setForm] = useState<ProfileForm>({ full_name: '', phone: '', avatar_url: null });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const employee = profileData?.employee;
  const profile = profileData?.profile;
  const displayName = form.full_name || profile?.full_name || 'DY Group';
  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const avatarUrl = employee?.avatar_url || form.avatar_url;

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      const data = await profileService.getMyProfile();
      setProfileData(data);
      setForm({
        full_name: data.profile.full_name ?? '',
        phone: data.profile.phone ?? '',
        avatar_url: data.profile.avatar_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取个人资料失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const uploadedUrl = await profileService.uploadAvatar(file);
      await profileService.updateMyProfile({ full_name: form.full_name, phone: form.phone, avatar_url: uploadedUrl });
      setForm((current) => ({ ...current, avatar_url: uploadedUrl }));
      setProfileData((current) =>
        current ? { ...current, profile: { ...current.profile, avatar_url: uploadedUrl } } : current,
      );
      setSuccess('头像已更新。');
    } catch (err) {
      setError(`头像上传失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (!form.full_name.trim()) {
      setError('姓名不能为空。');
      setSaving(false);
      return;
    }

    try {
      await profileService.updateMyProfile(form);
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                full_name: form.full_name.trim(),
                phone: form.phone.trim() || null,
                avatar_url: form.avatar_url,
              },
            }
          : current,
      );
      setSuccess('个人资料已保存。');
    } catch (err) {
      setError(`保存个人资料失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="profile-page">
        <div className="page-panel table-state">正在读取个人资料...</div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      {error ? <p className="form-alert">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="profile-grid profile-grid-wide">
        <div className="profile-card profile-photo-card">
          <button className="profile-photo-frame" type="button" onClick={() => avatarUrl && setPreviewOpen(true)} disabled={!avatarUrl}>
            {avatarUrl ? <img src={avatarUrl} alt="个人头像" /> : <span>{initials}</span>}
          </button>
          <label className="secondary-action profile-upload-button">
            <Camera size={17} />
            {uploading ? '上传中...' : '更换头像'}
            <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || saving} />
          </label>
        </div>

        <form className="profile-card" onSubmit={handleSubmit}>
          <div className="panel-title-row">
            <div>
              <span>基本资料</span>
              <h3>可编辑资料</h3>
            </div>
            <UserRound size={20} />
          </div>
          <label className="form-field">
            <span>姓名</span>
            <input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>电话</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>邮箱</span>
            <input value={profile?.email ?? ''} disabled />
          </label>
          <button className="primary-button" type="submit" disabled={saving || uploading}>
            {saving ? '保存中...' : '保存个人资料'}
          </button>
        </form>

        <div className="profile-card">
          <div className="panel-title-row">
            <div>
              <span>员工资料</span>
              <h3>公司资料</h3>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="profile-info-list">
            <ProfileInfo label="昵称" value={employee?.nickname} />
            <ProfileInfo label="员工编号" value={employee?.employee_code} />
            <ProfileInfo label="职位" value={employee?.job_title?.name} />
            <ProfileInfo label="区域" value={employee?.region?.name ?? employee?.region?.code} />
            <ProfileInfo label="雇佣类型" value={employee?.employment_type?.name} />
            <ProfileInfo label="生日" value={employee?.birthday} />
            <ProfileInfo label="身份证号" value={employee?.identity_number} />
            <ProfileInfo label="地址" value={employee?.address} />
            <ProfileInfo label="银行" value={employee?.bank_name} />
            <ProfileInfo label="银行户口" value={employee?.bank_account} />
            <ProfileInfo label="基本薪资" value={formatMoney(employee?.base_salary)} />
            <ProfileInfo label="入职日期" value={employee?.hire_date} />
            <ProfileInfo label="正式日期" value={employee?.probation_confirm_date} />
          </div>
        </div>

        <div className="profile-card">
          <div className="panel-title-row">
            <div>
              <span>班次资料</span>
              <h3>默认上下班时间</h3>
            </div>
            <Lock size={20} />
          </div>
          <div className="profile-info-list">
            <ProfileInfo label="上班时间" value={formatTime(employee?.start_work_time)} />
            <ProfileInfo label="下班时间" value={formatTime(employee?.end_work_time)} />
          </div>
        </div>

        <div className="profile-card profile-security-card">
          <div className="panel-title-row">
            <div>
              <span>安全设置</span>
              <h3>账号安全</h3>
            </div>
            <Lock size={20} />
          </div>
          <div className="profile-security-list">
            <button className="secondary-action" type="button" disabled>
              修改密码
            </button>
            <button className="secondary-action" type="button" disabled>
              登出所有设备
            </button>
            <button className="secondary-action" type="button" disabled>
              两步验证（2FA）
            </button>
          </div>
          <p className="form-helper">安全功能已预留，后续阶段再接入。</p>
        </div>
      </div>

      {previewOpen && avatarUrl ? (
        <SystemModal title={displayName} subtitle="头像预览" ariaLabel="头像预览" className="profile-preview-modal" onClose={() => setPreviewOpen(false)}>
          <img src={avatarUrl} alt="头像大图" />
        </SystemModal>
      ) : null}
    </section>
  );
}

function ProfileInfo({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '未设置'}</strong>
    </div>
  );
}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '未设置';
}

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? '未设置' : `RM ${value.toFixed(2)}`;
}
