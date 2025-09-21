import React from 'react';

interface HeaderProps {
    userName: string;
    categories: string[];
    selectedCategory: string;
    onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onThemeChange: () => void;
    onLogout: () => void;
    onBackToOnboarding: () => void;
    onChangePassword: () => void;
}

const Header: React.FC<HeaderProps> = ({
    userName,
    categories,
    selectedCategory,
    onCategoryChange,
    searchTerm,
    onSearchChange,
    onThemeChange,
    onLogout,
    onBackToOnboarding,
    onChangePassword,
}) => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'neon';
    const themeIcons = { dark: '🌙', light: '☀️', neon: '👽' };
    
    return (
        <header className="main-header">
            <div className="header-left">
                <button onClick={onBackToOnboarding} id="back-to-onboarding-btn" title="Voltar para reconfigurar a ToolBox">
                    &larr; Voltar
                </button>
                {categories.length > 0 && (
                     <select 
                        id="category-selector"
                        className="category-selector"
                        value={selectedCategory} 
                        onChange={onCategoryChange}
                    >
                        <option value="all">Todos</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                )}
                <h1 className="user-greeting" style={{ fontSize: '1.2rem', fontWeight: 500 }}>Olá, {userName}!</h1>
            </div>
            <div className="header-right">
                <input
                    type="search"
                    className="search-bar"
                    placeholder="Buscar ferramenta..."
                    value={searchTerm}
                    onChange={onSearchChange}
                />
                <button onClick={onThemeChange} className="theme-switcher" title="Alternar tema">
                    <span>{themeIcons[currentTheme as keyof typeof themeIcons] || '🌙'}</span>
                </button>
                <button onClick={onChangePassword} className="logout-btn">Alterar Senha</button>
                <button onClick={onLogout} className="logout-btn">Sair</button>
            </div>
        </header>
    );
};

export default Header;