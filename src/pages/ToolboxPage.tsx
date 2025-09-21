import React, { useState, useMemo, useEffect } from 'react';
import { User, Tool } from '../types';
import Header from '../components/Header';
import ToolCard from '../components/ToolCard';
import Modal from '../components/Modal';
import { supabase } from '../supabaseClient';

interface ToolboxPageProps {
    user: User;
    allTools: Tool[];
    permittedTools: Tool[];
    categories: string[];
    onLogout: () => void;
    onBackToOnboarding: () => void;
}

const getVideoSource = (url: string | undefined) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1] || url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
    }
    // Add other video sources logic if needed
    return null;
};

const EyeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const EyeOffIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);

const PasswordToggle: React.FC<{isVisible: boolean, onToggle: () => void}> = ({isVisible, onToggle}) => (
    <button type="button" onClick={onToggle} className="toggle-password" aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}>
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
);


const ToolboxPage: React.FC<ToolboxPageProps> = ({ user, allTools, permittedTools, categories, onLogout, onBackToOnboarding }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingTool, setViewingTool] = useState<{ link: string, name: string } | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const permittedToolIds = useMemo(() => new Set(permittedTools.map(t => t.id)), [permittedTools]);

    useEffect(() => {
        // Reset category filter if it becomes invalid after tools change, or set a default
        if (categories.length > 0 && !categories.includes(selectedCategory) && selectedCategory !== 'all') {
            setSelectedCategory('all');
        } else if (categories.length === 0) {
            setSelectedCategory('all');
        }
    }, [categories, selectedCategory]);

    const filteredTools = useMemo(() => {
        return allTools.filter(tool => {
            const inCategory = selectedCategory === 'all' || tool.category === selectedCategory;
            const inSearch = searchTerm === '' || 
                             tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             tool.description.toLowerCase().includes(searchTerm.toLowerCase());
            return inCategory && inSearch;
        });
    }, [allTools, selectedCategory, searchTerm]);

    const tutorialVideos = useMemo(() => {
        return filteredTools.filter(tool => tool.video && getVideoSource(tool.video));
    }, [filteredTools]);
    
    useEffect(() => {
        if(tutorialVideos.length > 0) {
            setCurrentVideoUrl(getVideoSource(tutorialVideos[0].video));
        } else {
            setCurrentVideoUrl(null);
        }
    }, [tutorialVideos, selectedCategory]); // also depends on category to reset video list

    const handleThemeChange = () => {
        const themes = ['dark', 'light', 'neon'];
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'neon';
        const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        document.documentElement.setAttribute('data-theme', themes[nextIndex]);
    };

    const handleAccessTool = (link: string, name: string) => {
        setViewingTool({ link, name });
    };

     const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;

        setPasswordError('');
        setPasswordSuccess('');
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            setPasswordError('As novas senhas não coincidem.');
            setIsSubmitting(false);
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
            setIsSubmitting(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('perfis')
                .select('id')
                .eq('id', user.id)
                .eq('senha', currentPassword)
                .single();

            if (error || !data) {
                setPasswordError('A senha atual está incorreta.');
                return;
            }

            const { error: updateError } = await supabase
                .from('perfis')
                .update({ senha: newPassword })
                .eq('id', user.id);
            
            if (updateError) {
                throw updateError;
            }

            setPasswordSuccess('Senha alterada com sucesso!');
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPasswordSuccess('');
                setPasswordError('');
            }, 2000);

        } catch (error: any) {
            setPasswordError(`Erro ao atualizar a senha: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (viewingTool) {
        return (
            <div className="iframe-wrapper">
                <header className="iframe-header">
                    <button onClick={() => setViewingTool(null)} className="back-to-toolbox-btn">&larr; Voltar</button>
                    <h2 className="iframe-tool-name">{viewingTool.name}</h2>
                </header>
                <iframe src={viewingTool.link} title={viewingTool.name} className="tool-iframe" allow="fullscreen"></iframe>
            </div>
        );
    }
    
    return (
        <div className="toolbox-section">
            <Header
                userName={user.name}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={(e) => setSelectedCategory(e.target.value)}
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
                onThemeChange={handleThemeChange}
                onLogout={onLogout}
                onBackToOnboarding={onBackToOnboarding}
                onChangePassword={() => setIsPasswordModalOpen(true)}
            />
            <main className="tool-panel">
                {tutorialVideos.length > 0 && (
                    <>
                        <h2 className="section-title">VÍDEO TUTORIAL</h2>
                        <div className="tutorial-section">
                            <div className="video-player-wrapper">
                                {currentVideoUrl && <iframe src={currentVideoUrl} className="tutorial-player" title="Video Player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>}
                            </div>
                            <div className="video-list">
                                {tutorialVideos.map(video => (
                                    <button 
                                        key={video.id} 
                                        className={`video-list-item ${getVideoSource(video.video) === currentVideoUrl ? 'active' : ''}`}
                                        onClick={() => setCurrentVideoUrl(getVideoSource(video.video))}
                                    >
                                        {video.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <div className="tool-grid-container">
                    <h2 className="section-title">FERRAMENTAS</h2>
                    <div className="tool-grid">
                        {filteredTools.length > 0 ? (
                            filteredTools.map((tool, index) => {
                                const isLocked = !permittedToolIds.has(tool.id);
                                return (
                                    <ToolCard 
                                        key={tool.id} 
                                        tool={tool} 
                                        onAccess={handleAccessTool}
                                        isLocked={isLocked}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    />
                                );
                            })
                        ) : (
                            <p>Nenhuma ferramenta encontrada para os filtros selecionados.</p>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
                <form onSubmit={handlePasswordChange}>
                    <div className="modal-header">
                        <h2>Alterar Senha</h2>
                        <p style={{color: 'var(--color-text-secondary)', marginTop: '8px'}}>Para sua segurança, informe sua senha atual e a nova senha desejada.</p>
                    </div>
                    <div style={{textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0'}}>
                        <div className="input-group">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                placeholder="Senha Atual"
                                required
                            />
                             <PasswordToggle isVisible={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
                        </div>
                        <div className="input-group">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                placeholder="Nova Senha"
                                required
                            />
                             <PasswordToggle isVisible={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
                        </div>
                         <div className="input-group">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Confirme a Nova Senha"
                                required
                            />
                        </div>
                    </div>
                    {passwordError && <p className="error-message" style={{opacity: 1}}>{passwordError}</p>}
                    {passwordSuccess && <p className="success-message" style={{opacity: 1}}>{passwordSuccess}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="admin-btn secondary">Cancelar</button>
                        <button type="submit" className="login-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ToolboxPage;