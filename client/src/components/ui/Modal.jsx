import { useEffect } from "react";
import { createPortal } from "react-dom";

const Modal = ({
  open,
  onClose,
  children,
  className = "max-w-md",
  overlayClassName = "bg-black/50",
}) => {
  // Prevent background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[99999] flex items-center justify-center"
    >
      {/* overlay */}
      <div
        className={`absolute inset-0 ${overlayClassName}`}
        onClick={onClose}
      />
      {/* modal panel */}
      <div
        className={`relative z-[100000] w-full ${className} mx-4 rounded-2xl bg-white shadow-2xl border border-black/5`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
