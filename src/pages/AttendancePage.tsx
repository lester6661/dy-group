import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Clock, LogIn, LogOut, MapPin, RefreshCw, Wifi } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  AttendanceRecordItem,
  attendanceService,
  getPublicIpAddress,
} from '../services/attendance.service';
import type { AttendancePunchType } from '../types/database';

const punchTypeLabels: Record<AttendancePunchType, string> = {
  clock_in: '上班打卡',
  clock_out: '下班打卡',
};

type GeoState = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function AttendancePage() {
  const { profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [geoState, setGeoState] = useState<GeoState | null>(null);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<AttendancePunchType | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const deviceInfo = useMemo(() => navigator.userAgent, []);

  useEffect(() => {
    startCamera();
    loadLocation();
    loadIpAddress();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadRecords(profile.id);
    }
  }, [profile?.id]);

  async function startCamera() {
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setError('无法启动摄像头。请允许浏览器使用摄像头后再试。');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function loadLocation() {
    if (!navigator.geolocation) {
      setError('当前浏览器不支持 GPS 定位。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        setError('无法获取 GPS。请允许浏览器使用定位后再试。');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function loadIpAddress() {
    const ip = await getPublicIpAddress();
    setIpAddress(ip);
  }

  async function loadRecords(profileId = profile?.id) {
    if (!profileId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const attendanceRecords = await attendanceService.listMyAttendanceRecords(profileId);
      setRecords(attendanceRecords);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取打卡记录失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handlePunch(punchType: AttendancePunchType) {
    if (!profile?.id) {
      setError('无法确认当前用户。');
      return;
    }

    if (!cameraReady) {
      setError('请先开启摄像头。');
      return;
    }

    if (!geoState) {
      setError('请先允许 GPS 定位。');
      return;
    }

    setSubmitting(punchType);
    setError('');
    setMessage('');

    try {
      const photoBlob = await capturePhotoBlob();
      await attendanceService.createAttendanceRecord({
        profileId: profile.id,
        punchType,
        photoBlob,
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
        ipAddress,
        deviceInfo,
      });

      setMessage(`${punchTypeLabels[punchType]}成功。`);
      await loadRecords(profile.id);
    } catch (punchError) {
      setError(punchError instanceof Error ? punchError.message : '打卡失败。');
    } finally {
      setSubmitting(null);
    }
  }

  async function capturePhotoBlob() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error('无法读取摄像头画面。');
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('无法生成打卡照片。');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('无法保存打卡照片。'));
        },
        'image/jpeg',
        0.88,
      );
    });
  }

  return (
    <section className="attendance-page">
      <div className="staff-toolbar">
        <div className="page-heading">
          <span>员工端</span>
          <h2>考勤打卡</h2>
          <p>使用浏览器摄像头实时拍照，并自动记录 GPS、IP、设备信息与打卡时间。</p>
        </div>

        <button className="secondary-action" type="button" onClick={() => loadRecords()} disabled={loading}>
          <RefreshCw size={17} />
          <span>刷新</span>
        </button>
      </div>

      <div className="attendance-grid">
        <div className="camera-panel">
          <div className="panel-title-row">
            <div>
              <span>实时拍照</span>
              <h3>浏览器摄像头</h3>
            </div>
            <Camera size={22} />
          </div>

          <div className="camera-frame">
            <video ref={videoRef} autoPlay playsInline muted />
            {!cameraReady ? <div className="camera-placeholder">等待摄像头授权</div> : null}
          </div>
          <canvas ref={canvasRef} className="hidden-canvas" />

          <div className="attendance-meta-grid">
            <MetaItem icon={<MapPin size={17} />} label="GPS" value={geoState ? `${geoState.latitude.toFixed(5)}, ${geoState.longitude.toFixed(5)}` : '等待定位'} />
            <MetaItem icon={<Wifi size={17} />} label="IP" value={ipAddress ?? '自动获取中'} />
            <MetaItem icon={<Clock size={17} />} label="时间" value={new Date().toLocaleString('zh-CN')} />
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <div className="punch-actions">
            <button className="primary-button" type="button" onClick={() => handlePunch('clock_in')} disabled={Boolean(submitting)}>
              <LogIn size={18} />
              <span>{submitting === 'clock_in' ? '打卡中' : '上班打卡'}</span>
            </button>
            <button className="secondary-button" type="button" onClick={() => handlePunch('clock_out')} disabled={Boolean(submitting)}>
              <LogOut size={18} />
              <span>{submitting === 'clock_out' ? '打卡中' : '下班打卡'}</span>
            </button>
          </div>
        </div>

        <div className="staff-list-panel">
          <div className="list-header">
            <div>
              <span>打卡记录</span>
              <h3>{records.length} 条记录</h3>
            </div>
          </div>

          {loading ? (
            <div className="table-state">正在读取打卡记录...</div>
          ) : records.length === 0 ? (
            <div className="table-state">暂无打卡记录。</div>
          ) : (
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>时间</th>
                    <th>GPS</th>
                    <th>IP</th>
                    <th>照片</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{punchTypeLabels[record.punch_type]}</td>
                      <td>{new Date(record.punched_at).toLocaleString('zh-CN')}</td>
                      <td>{Number(record.latitude).toFixed(5)}, {Number(record.longitude).toFixed(5)}</td>
                      <td>{record.ip_address || '-'}</td>
                      <td>已拍照</td>
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

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="attendance-meta-item">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
