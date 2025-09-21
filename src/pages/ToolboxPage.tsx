import React, { useState, useMemo, useEffect } from 'react';
import { User, Tool } from '../types';
import Header from '../components/Header';
import ToolCard from '../components/ToolCard';

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

const ToolboxPage: React.FC<ToolboxPageProps> = ({ user, allTools, permittedTools, categories, onLogout, onBackToOnboarding }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingTool, setViewingTool] = useState<{ link: string, name: string } | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

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
        </div>
    );
};

export default ToolboxPage;