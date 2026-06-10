type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="page-panel">
      <div className="page-heading">
        <span>Phase 1</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="empty-state">
        <strong>业务功能暂未开发</strong>
        <p>当前阶段仅建立正式版工程架构、页面路由与 Supabase 连接基础。</p>
      </div>
    </section>
  );
}
