import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import ToolboxPage from './pages/ToolboxPage';
import AdminPage from './pages/AdminPage';
import LoadingOverlay from './components/LoadingOverlay';
import ChatWidget from './components/ChatWidget';
import { Tool, User } from './types';
import { supabase } from './supabaseClient';
import OnboardingPage from './pages/OnboardingPage';

type View = 'login' | 'onboarding' | 'toolbox' | 'admin';

const App: React.FC = () => {
    const [view, setView] = useState<View>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Iniciando Sistema...');
    const [user, setUser] = useState<User | null>(null);
    const [allTools, setAllTools] = useState<Tool[]>([]);
    const [activeTools, setActiveTools] = useState<Tool[]>([]);
    const [userCategories, setUserCategories] = useState<string[]>([]);
    const [devtoolsBlocked, setDevtoolsBlocked] = useState(false);
    const [permittedTools, setPermittedTools] = useState<Tool[]>([]);

    // Devtools blocker logic
    useEffect(() => {
        const blockDevTools = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') ||
                (e.ctrlKey && e.key.toLowerCase() === 'u') ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c')
            ) {
                e.preventDefault();
                setDevtoolsBlocked(true);
            }
        };

        const preventContextMenu = (e: MouseEvent) => e.preventDefault();
        
        document.addEventListener('keydown', blockDevTools);
        document.addEventListener('contextmenu', preventContextMenu);

        const intervalId = setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
                setDevtoolsBlocked(true);
            }
        }, 1000);

        return () => {
            document.removeEventListener('keydown', blockDevTools);
            document.removeEventListener('contextmenu', preventContextMenu);
            clearInterval(intervalId);
        };
    }, []);

    // Theme initialization
    useEffect(() => {
        const themes = ['dark', 'light', 'neon'];
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme && themes.includes(savedTheme) ? savedTheme : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    const fetchAllTools = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('ferramentas')
                .select(`
                    id,
                    nome,
                    descricao,
                    icon,
                    link,
                    video_url,
                    dificuldade,
                    status,
                    categorias ( nome )
                `);

            if (error) throw error;
            if (!data) throw new Error('Nenhuma ferramenta encontrada.');

            const tools: Tool[] = data.map((tool: any) => ({
                id: tool.id,
                name: tool.nome || 'Nome Indisponível',
                description: tool.descricao || 'Descrição indisponível.',
                category: tool.categorias?.nome || 'Sem Categoria',
                icon: tool.icon || '❓',
                link: tool.link || '#',
                video: tool.video_url || '',
                dificuldade: tool.dificuldade || 'Básico',
                tooltip: `Acessar a ferramenta ${tool.nome || ''}`,
                status: tool.status
            }));
            setAllTools(tools);
        } catch (error) {
            console.error('Falha ao buscar ferramentas do Supabase:', error);
            alert('Não foi possível carregar as ferramentas. Verifique a conexão e tente novamente.');
        }
    }, []);

    const handleLoginSuccess = async (loggedInUser: User) => {
        setUser(loggedInUser);
        setIsLoading(true);
        setLoadingText('Carregando seu perfil...');
    
        try {
            await fetchAllTools();
    
            const { data, error } = await supabase
                .from('perfil_ferramentas')
                .select('ferramentas(*, categorias(nome))')
                .eq('perfil_id', loggedInUser.id);
    
            if (error) throw error;
            
            const userTools: Tool[] = data
                .map((item: any) => item.ferramentas)
                .filter((tool: any) => tool && tool.status === 'ativo')
                .map((tool: any) => ({
                    id: tool.id,
                    name: tool.nome || 'Nome Indisponível',
                    description: tool.descricao || 'Descrição indisponível.',
                    category: tool.categorias?.nome || 'Sem Categoria',
                    icon: tool.icon || '❓',
                    link: tool.link || '#',
                    video: tool.video_url || '',
                    dificuldade: tool.dificuldade || 'Básico',
                    tooltip: `Acessar a ferramenta ${tool.nome || ''}`,
                    status: tool.status,
                }));
    
            setPermittedTools(userTools);
            setView('onboarding');
        } catch (error) {
            console.error("Falha ao carregar dados do usuário:", error);
            alert('Não foi possível carregar seus dados. Fale com o administrador.');
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleOnboardingComplete = (selectedCategories: string[]) => {
        setIsLoading(true);
        setLoadingText('Montando sua ToolBox...');
        
        // This is still needed for the ChatWidget context
        const toolsForChat = permittedTools.filter(tool => selectedCategories.includes(tool.category));
        setActiveTools(toolsForChat);

        setUserCategories(selectedCategories);
        setView('toolbox');
        
        setTimeout(() => setIsLoading(false), 500);
    };


    const handleAdminLoginSuccess = async () => {
        setIsLoading(true);
        setLoadingText('Carregando sistema...');
        await fetchAllTools();
        setIsLoading(false);
        setView('admin');
    };
    
    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        setActiveTools([]);
        setPermittedTools([]);
        setUserCategories([]);
        setView('login');
    };

    const handleBackToOnboarding = () => {
        setView('onboarding');
    };

    if (devtoolsBlocked) {
        return (
            <div className="devtools-blocker">
                <h1>ACESSO RESTRITO</h1>
            </div>
        );
    }
    
    return (
        <>
            <LoadingOverlay isVisible={isLoading} text={loadingText} />
            
            {view === 'login' && (
                <LoginPage 
                    onLoginSuccess={handleLoginSuccess}
                    onAdminLoginSuccess={handleAdminLoginSuccess}
                />
            )}
            
            {view === 'onboarding' && user && (
                <OnboardingPage
                    user={user}
                    allTools={allTools}
                    permittedTools={permittedTools}
                    onOnboardingComplete={handleOnboardingComplete}
                    onLogout={handleLogout}
                />
            )}

            {view === 'toolbox' && user && (
                <ToolboxPage
                    user={user}
                    allTools={allTools}
                    permittedTools={permittedTools}
                    categories={[...new Set(allTools.map(t => t.category))].sort()}
                    onLogout={handleLogout}
                    onBackToOnboarding={handleBackToOnboarding}
                />
            )}

            {view === 'admin' && (
                <AdminPage allTools={allTools} onLogout={handleLogout} refreshTools={fetchAllTools} />
            )}

            {view === 'toolbox' && (
                 <ChatWidget
                    context="toolbox"
                    user={user}
                    allTools={allTools}
                    activeTools={activeTools}
                    selectedCategories={userCategories}
                />
            )}
        </>
    );
};

export default App;