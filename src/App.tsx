
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
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Iniciando Sistema...');
    const [user, setUser] = useState<User | null>(null);
    const [adminUser, setAdminUser] = useState<User | null>(null);
    const [allTools, setAllTools] = useState<Tool[]>([]);
    const [activeTools, setActiveTools] = useState<Tool[]>([]);
    const [userCategories, setUserCategories] = useState<string[]>([]);
    const [devtoolsBlocked, setDevtoolsBlocked] = useState(false);
    const [permittedTools, setPermittedTools] = useState<Tool[]>([]);

    // Proteção anti-DevTools aprimorada
    useEffect(() => {
        // Função para detectar dispositivos móveis e tablets de forma mais confiável.
        function isMobileOrTablet() {
            const userAgent = navigator.userAgent;

            // 1. Verificação padrão via User Agent para a maioria dos celulares.
            if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
                return true;
            }

            // 2. Detecção específica para iPads (com iPadOS 13+) que se identificam como um desktop Mac.
            if (/iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
                return true;
            }

            return false;
        }

        // Se for um dispositivo móvel ou tablet, o script de proteção é interrompido.
        if (isMobileOrTablet()) {
            return;
        }

        // As proteções abaixo serão executadas APENAS em DESKTOPS.

        // Bloqueio de teclas de atalho comuns para abrir DevTools
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
                return false;
            }
        };

        // Impede o clique com o botão direito do mouse (menu de contexto)
        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('keydown', blockDevTools);
        document.addEventListener('contextmenu', preventContextMenu);

        // Verifica periodicamente se as DevTools foram abertas medindo o tamanho da janela
        const devToolsCheckInterval = setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
                setDevtoolsBlocked(true);
                // Interrompe a verificação para economizar recursos
                clearInterval(devToolsCheckInterval);
            }
        }, 1000);

        return () => {
            document.removeEventListener('keydown', blockDevTools);
            document.removeEventListener('contextmenu', preventContextMenu);
            clearInterval(devToolsCheckInterval);
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
                    requer_login,
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
                status: tool.status,
                requer_login: tool.requer_login || false,
            }));
            setAllTools(tools);
        } catch (error) {
            console.error('Falha ao buscar ferramentas do Supabase:', error);
            alert('Não foi possível carregar as ferramentas. Verifique a conexão e tente novamente.');
        }
    }, []);

     // Session Restore Logic
    useEffect(() => {
        const restoreSession = async () => {
            const savedSession = localStorage.getItem('session');
            if (!savedSession) {
                setIsLoading(false);
                return;
            }

            setLoadingText('Restaurando sua sessão...');
            try {
                const sessionData = JSON.parse(savedSession);
                await fetchAllTools();

                if (sessionData.isAdmin && sessionData.view === 'admin') {
                    setAdminUser(sessionData.user || null);
                    setView('admin');
                } else if (sessionData.user && sessionData.view) {
                    setUser(sessionData.user);
                    const userPermittedTools = sessionData.permittedTools || [];
                    setPermittedTools(userPermittedTools);

                    if (sessionData.view === 'toolbox') {
                        const userSelectedCategories = sessionData.userCategories || [];
                        setUserCategories(userSelectedCategories);
                        const toolsForContext = userPermittedTools.filter((tool: Tool) =>
                            userSelectedCategories.includes(tool.category)
                        );
                        setActiveTools(toolsForContext);
                        setView('toolbox');
                    } else {
                        setView('onboarding');
                    }
                } else {
                    localStorage.removeItem('session');
                }
            } catch (error) {
                console.error("Falha ao restaurar sessão, limpando:", error);
                localStorage.removeItem('session');
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, [fetchAllTools]);

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
                    requer_login: tool.requer_login || false,
                }));
    
            setPermittedTools(userTools);
            localStorage.setItem('session', JSON.stringify({
                user: loggedInUser,
                view: 'onboarding',
                permittedTools: userTools
            }));
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
        
        const toolsForChat = permittedTools.filter(tool => selectedCategories.includes(tool.category));
        setActiveTools(toolsForChat);

        setUserCategories(selectedCategories);
        localStorage.setItem('session', JSON.stringify({
            user,
            view: 'toolbox',
            permittedTools,
            userCategories: selectedCategories
        }));
        setView('toolbox');
        
        setTimeout(() => setIsLoading(false), 500);
    };


    const handleAdminLoginSuccess = async (loggedInAdmin: User) => {
        setIsLoading(true);
        setLoadingText('Carregando sistema...');
        await fetchAllTools();
        setAdminUser(loggedInAdmin);
        localStorage.setItem('session', JSON.stringify({ isAdmin: true, view: 'admin', user: loggedInAdmin }));
        setIsLoading(false);
        setView('admin');
    };
    
    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        setAdminUser(null);
        setActiveTools([]);
        setPermittedTools([]);
        setUserCategories([]);
        setView('login');
    };

    const handleBackToOnboarding = () => {
        const sessionData = JSON.parse(localStorage.getItem('session') || '{}');
        sessionData.view = 'onboarding';
        localStorage.setItem('session', JSON.stringify(sessionData));
        setView('onboarding');
    };

    if (devtoolsBlocked) {
        return (
            <div className="devtools-blocker">
                <h1>Acesso Bloqueado ❌</h1>
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
                    // FIX: Changed onLogout to handleLogout as 'onLogout' is not defined.
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
                <AdminPage user={adminUser} allTools={allTools} onLogout={handleLogout} refreshTools={fetchAllTools} />
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
