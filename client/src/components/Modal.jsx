import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = "max-w-md",
  title = "Modal",
  description = "Modal dialog"
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";

    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[9999]" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}} />
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
            >
              <Dialog.Content className={`relative bg-white rounded-xl p-6 w-full ${className} shadow-2xl max-h-[90vh] overflow-y-auto`} style={{backgroundColor: 'white', zIndex: 10000}}>
                {/* Hidden title and description for accessibility */}
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">{description}</Dialog.Description>
                
                <Dialog.Close asChild>
                  <button className="absolute top-3 right-4 text-gray-500 hover:text-red-500 z-10">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
                {children}
              </Dialog.Content>
            </motion.div>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}

export default Modal;
