import React from 'react';

interface LoadingOverlayProps {
    isVisible: boolean;
    text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, text = 'Carregando...' }) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">{text}</p>
        </div>
    );
};

export default LoadingOverlay;
