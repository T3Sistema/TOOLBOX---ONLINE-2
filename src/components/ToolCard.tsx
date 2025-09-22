import React from 'react';
import { Tool } from '../types';

interface ToolCardProps {
    tool: Tool;
    onAccess: (tool: Tool) => void;
    style?: React.CSSProperties;
    isLocked: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onAccess, style, isLocked }) => {
    const difficultyClass = tool.dificuldade.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return (
        <div className={`tool-card ${isLocked ? 'locked' : ''}`} title={tool.tooltip} style={style}>
            <div className="tool-card-header">
                <span className="tool-icon">{tool.icon}</span>
                <h3>{tool.name}</h3>
                <div className={`difficulty-indicator ${difficultyClass}`} title={`Nível: ${tool.dificuldade}`}>
                    <span className="bar bar-1"></span>
                    <span className="bar bar-2"></span>
                    <span className="bar bar-3"></span>
                </div>
            </div>
            <p>{tool.description}</p>
            <div className="tool-card-footer">
                <span className="tool-category-tag">{tool.category}</span>
                {isLocked ? (
                    <button type="button" className="tool-access-btn" disabled>
                        Bloqueado 🔒
                    </button>
                ) : (
                    <button
                        type="button"
                        className="tool-access-btn"
                        onClick={() => onAccess(tool)}
                    >
                        Acessar
                    </button>
                )}
            </div>
        </div>
    );
};

export default ToolCard;