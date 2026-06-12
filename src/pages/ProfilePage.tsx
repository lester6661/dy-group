import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Download, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { SystemModal } from '../components/SystemModal';
import { profileService, type MyProfileData, type MyProfileUpdateValues } from '../services/profile.service';
import logoUrl from '../assets/logo.png';

type ProfileForm = {
  phone: string;
  avatar_url: string | null;
  nickname: string;
  address: string;
  bank_name: string;
  bank_account: string;
};

const companyInstagram = '@dygroup';
const companyFacebook = 'DY Group';

export function ProfilePage() {
  const [profileData, setProfileData] = useState<MyProfileData | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    phone: '',
    avatar_url: null,
    nickname: '',
    address: '',
    bank_name: '',
    bank_account: '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadChoiceOpen, setDownloadChoiceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const employee = profileData?.employee;
  const profile = profileData?.profile;
  const displayName = employee?.full_name || profile?.full_name || 'DY Group';
  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const avatarUrl = employee?.avatar_url || form.avatar_url;
  const whatsapp = form.phone || employee?.phone || profile?.phone || '未设置';
  const companyEnglishName = employee?.region?.company_english_name ?? '';
  const companyRegistrationNo = employee?.region?.company_registration_no ?? '';

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
        phone: data.employee?.phone ?? data.profile.phone ?? '',
        avatar_url: data.employee?.avatar_url ?? data.profile.avatar_url,
        nickname: data.employee?.nickname ?? '',
        address: data.employee?.address ?? '',
        bank_name: data.employee?.bank_name ?? '',
        bank_account: data.employee?.bank_account ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取个人资料失败。');
    } finally {
      setLoading(false);
    }
  }

  function getUpdateValues(nextForm = form): MyProfileUpdateValues {
    return {
      full_name: displayName,
      phone: nextForm.phone,
      avatar_url: nextForm.avatar_url,
      nickname: nextForm.nickname,
      address: nextForm.address,
      bank_name: nextForm.bank_name,
      bank_account: nextForm.bank_account,
    };
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
      const nextForm = { ...form, avatar_url: uploadedUrl };
      await profileService.updateMyProfile(getUpdateValues(nextForm));
      setForm(nextForm);
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: { ...current.profile, avatar_url: uploadedUrl },
              employee: current.employee ? { ...current.employee, avatar_url: uploadedUrl } : current.employee,
            }
          : current,
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

    try {
      await profileService.updateMyProfile(getUpdateValues());
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                phone: form.phone.trim() || null,
                avatar_url: form.avatar_url,
              },
              employee: current.employee
                ? {
                    ...current.employee,
                    phone: form.phone.trim() || null,
                    nickname: form.nickname.trim() || null,
                    address: form.address.trim() || null,
                    bank_name: form.bank_name.trim() || null,
                    bank_account: form.bank_account.trim() || null,
                    avatar_url: form.avatar_url,
                  }
                : current.employee,
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

  async function handleDownloadCard(orientation: 'horizontal' | 'vertical') {
    setDownloadingCard(true);
    setError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = orientation === 'horizontal' ? 1600 : 960;
      canvas.height = orientation === 'horizontal' ? 960 : 1600;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('无法生成电子名片。');
      }

      await drawBusinessCard(context, {
        orientation,
        name: displayName,
        jobTitle: employee?.job_title?.name ?? 'DY Group',
        whatsapp,
        wechat: '未设置',
        avatarUrl,
        initials,
        companyEnglishName,
        companyRegistrationNo,
      });

      const link = document.createElement('a');
      link.download = `${displayName}-${orientation === 'horizontal' ? '横式' : '竖式'}电子名片.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadChoiceOpen(false);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '下载电子名片失败。');
    } finally {
      setDownloadingCard(false);
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

      <div className="profile-card business-card-section">
        <div className="business-card-preview">
          <div className="business-card-company">
            <img src={logoUrl} alt="DY Group" />
            <strong>东娱传媒</strong>
            {companyEnglishName ? <span>{companyEnglishName}</span> : null}
            {companyRegistrationNo ? <small>Reg. No. {companyRegistrationNo}</small> : null}
          </div>

          <div className="business-card-main">
            <div className="business-card-info">
              <h2>{displayName}</h2>
              <strong>{employee?.job_title?.name ?? '未设置职称'}</strong>
              <div className="business-card-contact-grid">
                <CardContact label="Whatsapp" value={whatsapp} />
                <CardContact label="微信" value="未设置" />
                <CardContact label="公司 IG" value={companyInstagram} />
                <CardContact label="公司 FB" value={companyFacebook} />
              </div>
              <button className="primary-button business-card-download" type="button" onClick={() => setDownloadChoiceOpen(true)} disabled={downloadingCard}>
                <Download size={18} />
                <span>{downloadingCard ? '生成中...' : '下载电子名片'}</span>
              </button>
            </div>

            <button className="business-card-photo" type="button" onClick={() => avatarUrl && setPreviewOpen(true)} disabled={!avatarUrl}>
              {avatarUrl ? <img src={avatarUrl} alt="个人头像" /> : <span>{initials}</span>}
            </button>
          </div>
        </div>
      </div>

      <form className="profile-card" onSubmit={handleSubmit}>
        <div className="panel-title-row">
          <div>
            <span>基本资料</span>
            <h3>个人与员工资料</h3>
          </div>
          <UserRound size={20} />
        </div>

        <div className="profile-final-grid">
          <ReadOnlyField label="姓名" value={displayName} />
          <EditableField label="昵称" value={form.nickname} onChange={(value) => setForm((current) => ({ ...current, nickname: value }))} />
          <ReadOnlyField label="生日" value={employee?.birthday} />
          <EditableField label="电话" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <ReadOnlyField label="邮箱" value={profile?.email} />
          <EditableField label="地址" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
          <ReadOnlyField label="员工编号" value={employee?.employee_code} />
          <ReadOnlyField label="职位" value={employee?.job_title?.name} />
          <ReadOnlyField label="区域" value={employee?.region?.name ?? employee?.region?.code} />
          <ReadOnlyField label="雇佣类型" value={employee?.employment_type?.name} />
          <ReadOnlyField label="入职日期" value={employee?.hire_date} />
          <ReadOnlyField label="正式日期" value={employee?.probation_confirm_date} />
          <ReadOnlyField label="上班时间" value={formatTime(employee?.start_work_time)} />
          <ReadOnlyField label="下班时间" value={formatTime(employee?.end_work_time)} />
          <EditableField label="银行" value={form.bank_name} onChange={(value) => setForm((current) => ({ ...current, bank_name: value }))} />
          <EditableField label="银行户口" value={form.bank_account} onChange={(value) => setForm((current) => ({ ...current, bank_account: value }))} />
        </div>

        <button className="primary-button profile-save-button" type="submit" disabled={saving || uploading}>
          {saving ? '保存中...' : '保存个人资料'}
        </button>
      </form>

      <div className="profile-card">
        <div className="panel-title-row">
          <div>
            <span>敏感资料</span>
            <h3>未来由权限系统控制</h3>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="profile-info-list">
          <ProfileInfo label="基本薪资" value={formatMoney(employee?.base_salary)} />
          <ProfileInfo label="身份证号码" value={employee?.identity_number} />
        </div>
      </div>

      <div className="profile-card profile-security-card">
        <div className="panel-title-row">
          <div>
            <span>账号安全</span>
            <h3>安全设置</h3>
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
            两步验证 Coming Soon
          </button>
        </div>
      </div>

      {previewOpen && avatarUrl ? (
        <SystemModal
          title={displayName}
          subtitle="头像预览"
          ariaLabel="头像预览"
          className="profile-preview-modal"
          onClose={() => setPreviewOpen(false)}
          footer={
            <label className="secondary-action profile-upload-button">
              <Camera size={17} />
              {uploading ? '上传中...' : '更换头像'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || saving} />
            </label>
          }
        >
          <img src={avatarUrl} alt="头像大图" />
        </SystemModal>
      ) : null}

      {downloadChoiceOpen ? (
        <SystemModal title="下载电子名片" subtitle="选择版式" ariaLabel="下载电子名片" wide={false} onClose={() => setDownloadChoiceOpen(false)}>
          <div className="business-card-download-options">
            <button className="secondary-action" type="button" onClick={() => handleDownloadCard('horizontal')} disabled={downloadingCard}>
              下载横式电子名片
            </button>
            <button className="secondary-action" type="button" onClick={() => handleDownloadCard('vertical')} disabled={downloadingCard}>
              下载竖式电子名片
            </button>
          </div>
        </SystemModal>
      ) : null}
    </section>
  );
}

function CardContact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-field profile-final-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <label className="form-field profile-final-field">
      <span>{label}</span>
      <input value={value || '未设置'} disabled />
    </label>
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

async function drawBusinessCard(
  context: CanvasRenderingContext2D,
  values: {
    orientation: 'horizontal' | 'vertical';
    name: string;
    jobTitle: string;
    whatsapp: string;
    wechat: string;
    avatarUrl: string | null | undefined;
    initials: string;
    companyEnglishName: string;
    companyRegistrationNo: string;
  },
) {
  const { canvas } = context;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const accentGradient = context.createLinearGradient(0, 0, canvas.width, 0);
  accentGradient.addColorStop(0, '#e83e8c');
  accentGradient.addColorStop(1, '#7c3aed');
  context.fillStyle = accentGradient;
  context.fillRect(0, 0, canvas.width, values.orientation === 'horizontal' ? 28 : 34);

  context.fillStyle = '#ffffff';
  context.strokeStyle = '#dfe6ef';
  context.lineWidth = 2;
  roundedRect(context, 34, 34, canvas.width - 68, canvas.height - 68, 26);
  context.fill();
  context.stroke();

  const logo = await loadImage(logoUrl);
  const companyCenterX = canvas.width / 2;
  const companyTop = values.orientation === 'horizontal' ? 84 : 92;

  if (logo) {
    drawContainImage(context, logo, companyCenterX - 46, companyTop, 92, 92);
  }

  context.fillStyle = '#172033';
  context.textAlign = 'center';
  context.font = 'bold 42px "Microsoft YaHei", Arial';
  context.fillText('东娱传媒', companyCenterX, companyTop + 138);

  context.fillStyle = '#172033';
  context.font = 'bold 26px Arial';
  if (values.companyEnglishName) {
    context.fillText(values.companyEnglishName, companyCenterX, companyTop + 178);
  }

  context.fillStyle = '#68758a';
  context.font = '22px Arial';
  if (values.companyRegistrationNo) {
    context.fillText(`Reg. No. ${values.companyRegistrationNo}`, companyCenterX, companyTop + 214);
  }

  const image = values.avatarUrl ? await loadImage(values.avatarUrl) : null;

  if (values.orientation === 'horizontal') {
    drawCardDetails(context, values, image, 128, 388, 800);
    drawAvatar(context, values, image, 1060, 396, 330);
    return;
  }

  drawAvatar(context, values, image, 300, 440, 360);
  drawCardDetails(context, values, image, 122, 920, 716);
}

function drawCardDetails(
  context: CanvasRenderingContext2D,
  values: {
    name: string;
    jobTitle: string;
    whatsapp: string;
    wechat: string;
  },
  _image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
) {
  context.textAlign = 'left';
  context.fillStyle = '#172033';
  context.font = 'bold 56px "Microsoft YaHei", Arial';
  context.fillText(values.name, x, y);

  context.fillStyle = '#1f7a8c';
  context.font = 'bold 30px "Microsoft YaHei", Arial';
  context.fillText(values.jobTitle, x, y + 58);

  context.fillStyle = '#68758a';
  context.font = 'bold 25px Arial';
  const rows = [
    ['Whatsapp', values.whatsapp],
    ['微信', values.wechat],
    ['公司 IG', companyInstagram],
    ['公司 FB', companyFacebook],
  ];

  rows.forEach(([label, value], index) => {
    const rowY = y + 142 + index * 54;
    context.fillStyle = '#68758a';
    context.fillText(label, x, rowY);
    context.fillStyle = '#172033';
    context.fillText(value, x + Math.min(180, width * 0.28), rowY);
  });
}

function drawAvatar(
  context: CanvasRenderingContext2D,
  values: { initials: string },
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
) {
  context.save();
  roundedRect(context, x, y, size, size, 26);
  context.clip();

  if (image) {
    drawCoverImage(context, image, x, y, size, size);
  } else {
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#e83e8c');
    gradient.addColorStop(1, '#7c3aed');
    context.fillStyle = gradient;
    context.fillRect(x, y, size, size);
    context.fillStyle = '#ffffff';
    context.font = `bold ${Math.round(size * 0.38)}px Arial`;
    context.textAlign = 'center';
    context.fillText(values.initials, x + size / 2, y + size * 0.62);
  }

  context.restore();
  context.strokeStyle = '#dfe6ef';
  context.lineWidth = 3;
  roundedRect(context, x, y, size, size, 26);
  context.stroke();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawContainImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
