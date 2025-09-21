import React, { useState } from 'react';
import { User, Tool } from '../types';

interface OnboardingPageProps {
    user: User;
    allTools: Tool[];
    permittedTools: Tool[];
    onOnboardingComplete: (selectedCategories: string[]) => void;
    onLogout: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ user, allTools, permittedTools, onOnboardingComplete, onLogout }) => {
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

    const allSystemCategories = [...new Set(allTools.map(tool => tool.category))].sort();
    
    const permittedCategoryNames = new Set(permittedTools.map(tool => tool.category));

    const toggleCategory = (category: string) => {
        const newSelection = new Set(selectedCategories);
        if (newSelection.has(category)) {
            newSelection.delete(category);
        } else {
            newSelection.add(category);
        }
        setSelectedCategories(newSelection);
    };

    const handleSubmit = () => {
        if (selectedCategories.size > 0) {
            onOnboardingComplete(Array.from(selectedCategories));
        } else {
            alert("Por favor, selecione pelo menos uma categoria para montar sua ToolBox.");
        }
    };

    return (
        <main className="login-page onboarding-section">
            <div className="admin-panel">
                <div className="admin-panel-header">
                    <h2>Bem-vindo, {user.name}!</h2>
                    <p>Vamos montar sua ToolBox. Selecione as categorias que você deseja incluir no seu painel inicial.</p>
                </div>
                <div className="onboarding-grid">
                    {allSystemCategories.map(category => {
                        const hasAccess = permittedCategoryNames.has(category);
                        return (
                            <button
                                key={category}
                                className={`onboarding-category-item ${selectedCategories.has(category) ? 'selected' : ''} ${!hasAccess ? 'disabled' : ''}`}
                                onClick={() => hasAccess && toggleCategory(category)}
                                disabled={!hasAccess}
                                title={!hasAccess ? "Você não tem acesso a esta categoria. Fale com um administrador." : `Selecionar ${category}`}
                            >
                                {category}
                                {!hasAccess && <span className="lock-icon" role="img" aria-label="bloqueado">🔒</span>}
                            </button>
                        );
                    })}
                </div>
                <div className="admin-panel-footer">
                    <div className="admin-panel-actions" style={{ justifyContent: 'center' }}>
                         <button
                            onClick={onLogout}
                            className="admin-btn secondary"
                            type="button"
                        >
                            Sair
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="login-btn"
                            disabled={selectedCategories.size === 0}
                        >
                            Montar ToolBox
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default OnboardingPage;