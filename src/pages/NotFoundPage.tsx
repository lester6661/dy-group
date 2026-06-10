import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>页面不存在</h1>
      <p>请返回系统首页继续操作。</p>
      <Link to="/dashboard">返回仪表盘</Link>
    </main>
  );
}
