import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type SystemModalProps = {
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  wide?: boolean;
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
};

export function SystemModal({ title, subtitle, ariaLabel, wide = true, className = '', footer, children, onClose }: SystemModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal-panel${wide ? ' wide' : ''}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            {subtitle ? <span>{subtitle}</span> : null}
            <h3>{title}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
