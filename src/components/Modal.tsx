import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    type?: 'confirm' | 'delete' | 'success' | 'info' | 'toast';
    panelClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, type = 'info', panelClassName = '' }) => {
    if (!isOpen) {
        return null;
    }
    
    if (type === 'toast') {
        return (
             <div className="modal-overlay" onClick={onClose}>
                <div className="success-toast-panel" onClick={(e) => e.stopPropagation()}>
                    {children}
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-panel ${panelClassName}`} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};


interface SuccessRedirectModalProps {
    isOpen: boolean;
    message: string;
}
export const SuccessRedirectModal: React.FC<SuccessRedirectModalProps> = ({ isOpen, message }) => (
    <Modal isOpen={isOpen} onClose={() => {}} type="success">
         <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-dark-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div className="modal-header">
             <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{message}</p>
        </div>
    </Modal>
);

export default Modal;
