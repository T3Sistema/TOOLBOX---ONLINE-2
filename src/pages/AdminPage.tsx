import React, { useState, useEffect, useCallback } from 'react';
import { Tool, WaitingUser, ActiveUser } from '../types';
import Modal from '../components/Modal';
import { supabase } from '../supabaseClient';

type AdminTab = 'dashboard' | 'tools' | 'add_edit' | 'users' | 'categories' | 'active_users' | 'admins' | 'add_edit_admin';

interface AdminPageProps {
    allTools: Tool[];
    onLogout: () => void;
    refreshTools: () => void;
}

const EMOJIS = ['✨', '🚀', '🤖', '💡', '📈', '📊', '🎨', '📝', '🔗', '⚙️', '💬', '🎬', '🧠', '💼', '🛠️', '🌍'];

type ToolFormData = Omit<Tool, 'id' | 'tooltip' | 'status' | 'category'> & { status: 'ativo' | 'inativo', category: string };
type CategoryFormData = { id: number | null; nome: string; descricao: string };
type AdminFormData = { id: string | null; nome: string; email: string; senha?: string; };

const AdminPage: React.FC<AdminPageProps> = ({ allTools: initialTools, onLogout, refreshTools }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [categories, setCategories] = useState<{id: number, nome: string, descricao: string | null}[]>([]);
    const [waitingList, setWaitingList] = useState<WaitingUser[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [admins, setAdmins] = useState<ActiveUser[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // States for forms and modals
    const [toolToEdit, setToolToEdit] = useState<Tool | null>(null);
    const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
    const [userToDeny, setUserToDeny] = useState<WaitingUser | null>(null);
    const [userToApprove, setUserToApprove] = useState<WaitingUser | null>(null);
    const [userToEdit, setUserToEdit] = useState<ActiveUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<ActiveUser | null>(null);
    const [adminToEdit, setAdminToEdit] = useState<ActiveUser | null>(null);
    const [adminToDelete, setAdminToDelete] = useState<ActiveUser | null>(null);
    const [categoryToEdit, setCategoryToEdit] = useState<{id: number, nome: string, descricao: string | null} | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<{id: number, nome: string} | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedTools, setSelectedTools] = useState<Set<number>>(new Set());
    const [groupedTools, setGroupedTools] = useState<Record<string, Tool[]>>({});
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());


    const initialToolFormState: ToolFormData = {
        name: '', description: '', category: '', icon: '✨', link: '',
        video: '', dificuldade: 'Básico' as const, status: 'ativo' as const,
    };
    const [toolFormData, setToolFormData] = useState<ToolFormData>(initialToolFormState);
    
    const initialCategoryFormState: CategoryFormData = { id: null, nome: '', descricao: '' };
    const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormState);

    const initialAdminFormState: AdminFormData = { id: null, nome: '', email: '', senha: '' };
    const [adminFormData, setAdminFormData] = useState<AdminFormData>(initialAdminFormState);

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    useEffect(() => { setTools(initialTools); }, [initialTools]);

    useEffect(() => {
        if (userToApprove) {
            const grouped = tools.reduce((acc, tool) => {
                const category = tool.category || 'Outros';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(tool);
                return acc;
            }, {} as Record<string, Tool[]>);
            setGroupedTools(grouped);
            setSelectedTools(new Set()); // Reset selection
            setExpandedCategories(new Set()); // Reset expanded categories
        }
    }, [userToApprove, tools]);

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase.from('categorias').select('*').order('nome');
        if (error) console.error("Erro ao buscar categorias:", error);
        else setCategories(data || []);
    }, []);
    
    const fetchWaitingList = useCallback(async () => {
        const { data, error } = await supabase.from('lista_de_espera').select('*').eq('status', 'pendente');
        if (error) console.error('Erro ao verificar novos usuários:', error);
        else setWaitingList(data || []);
    }, []);

    const fetchActiveUsers = useCallback(async () => {
        const { data, error } = await supabase.from('perfis').select('*').eq('is_admin', false).order('nome');
        if (error) console.error("Erro ao buscar usuários ativos:", error);
        else setActiveUsers(data || []);
    }, []);
    
    const fetchAdmins = useCallback(async () => {
        const { data, error } = await supabase.from('perfis').select('*').eq('is_admin', true).order('nome');
        if (error) console.error("Erro ao buscar administradores:", error);
        else setAdmins(data || []);
    }, []);


    useEffect(() => {
        fetchCategories();
        fetchWaitingList();
        fetchActiveUsers();
        fetchAdmins();
        const intervalId = setInterval(fetchWaitingList, 30000); // Poll waiting list
        return () => clearInterval(intervalId);
    }, [fetchCategories, fetchWaitingList, fetchActiveUsers, fetchAdmins]);

    // Effect to reset forms when switching tabs or items
    useEffect(() => {
        if (activeTab === 'add_edit' && toolToEdit) {
            setToolFormData({
                name: toolToEdit.name, description: toolToEdit.description, category: toolToEdit.category,
                icon: toolToEdit.icon, link: toolToEdit.link, video: toolToEdit.video || '',
                dificuldade: toolToEdit.dificuldade, status: toolToEdit.status,
            });
        } else {
            setToolFormData(initialToolFormState);
        }
    }, [activeTab, toolToEdit]);

    useEffect(() => {
        if (activeTab === 'add_edit_admin' && adminToEdit) {
            setAdminFormData({
                id: adminToEdit.id,
                nome: adminToEdit.nome,
                email: adminToEdit.email,
                senha: '',
            });
        } else {
            setAdminFormData(initialAdminFormState);
        }
    }, [activeTab, adminToEdit]);
    
     useEffect(() => {
        if (categoryToEdit) {
            setCategoryFormData({ id: categoryToEdit.id, nome: categoryToEdit.nome, descricao: categoryToEdit.descricao || '' });
        } else {
            setCategoryFormData(initialCategoryFormState);
        }
    }, [categoryToEdit]);


    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 2500);
    };

    const handleSubmitTool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: categoryData } = await supabase.from('categorias').select('id').eq('nome', toolFormData.category).single();
            if (!categoryData) throw new Error(`Categoria "${toolFormData.category}" não encontrada. Crie-a primeiro na aba de Categorias.`);

            const toolPayload = {
                nome: toolFormData.name, descricao: toolFormData.description, categoria_id: categoryData.id,
                icon: toolFormData.icon, link: toolFormData.link, video_url: toolFormData.video || null,
                dificuldade: toolFormData.dificuldade, status: toolFormData.status,
            };

            if (toolToEdit) {
                const { error } = await supabase.from('ferramentas').update(toolPayload).eq('id', toolToEdit.id);
                if (error) throw error;
                showToast('Ferramenta atualizada com sucesso!');
            } else {
                const { error } = await supabase.from('ferramentas').insert(toolPayload);
                if (error) throw error;
                showToast('Ferramenta adicionada com sucesso!');
            }
            await refreshTools();
            setActiveTab('tools');
            setToolToEdit(null);
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setIsSubmitting(false); }
    };

    const handleDeleteTool = async () => {
        if (!toolToDelete) return;
        try {
            const { error } = await supabase.from('ferramentas').delete().eq('id', toolToDelete.id);
            if (error) throw error;
            showToast('Ferramenta excluída com sucesso!');
            await refreshTools();
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setToolToDelete(null); }
    };
    
    const handleToolSelection = (toolId: number) => {
        const newSelection = new Set(selectedTools);
        if (newSelection.has(toolId)) {
            newSelection.delete(toolId);
        } else {
            newSelection.add(toolId);
        }
        setSelectedTools(newSelection);
    };

    const toggleCategoryExpansion = (categoryName: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) {
                newSet.delete(categoryName);
            } else {
                newSet.add(categoryName);
            }
            return newSet;
        });
    };

    const handleSelectAllToolsInCategory = (toolsInCategory: Tool[], select: boolean) => {
        setSelectedTools(prev => {
            const newSet = new Set(prev);
            toolsInCategory.forEach(tool => {
                if (select) {
                    newSet.add(tool.id);
                } else {
                    newSet.delete(tool.id);
                }
            });
            return newSet;
        });
    };

    const handleConfirmApproval = async () => {
        if (!userToApprove) return;
        if (selectedTools.size === 0) {
            alert("Selecione pelo menos uma ferramenta para o usuário.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('perfis').insert({
                    nome: userToApprove.nome, email: userToApprove.email,
                    senha: userToApprove.password, is_active: true
                }).select('id').single();

            if (profileError || !profileData) throw profileError || new Error("Falha ao criar perfil.");

            const newUserId = profileData.id;
            const toolLinks = Array.from(selectedTools).map(toolId => ({
                perfil_id: newUserId, ferramenta_id: toolId
            }));

            const { error: linkError } = await supabase.from('perfil_ferramentas').insert(toolLinks);
            if (linkError) {
                await supabase.from('perfis').delete().eq('id', newUserId);
                throw linkError;
            }

            const { error: updateError } = await supabase.from('lista_de_espera').update({ status: 'aprovado' }).eq('id', userToApprove.id);
            if (updateError) throw updateError;
            
            showToast(`Usuário ${userToApprove.nome} aprovado com ${selectedTools.size} ferramentas!`);
            await fetchWaitingList();
            await fetchActiveUsers();
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setUserToApprove(null); setIsSubmitting(false); }
    };

    const handleDenyUser = async () => {
        if (!userToDeny) return;
        try {
            const { error } = await supabase.from('lista_de_espera').update({ status: 'rejeitado' }).eq('id', userToDeny.id);
            if (error) throw error;
            showToast(`Usuário ${userToDeny.nome} foi negado.`);
            await fetchWaitingList();
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setUserToDeny(null); }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { id, nome, descricao } = categoryFormData;
        try {
            if (id) { // Update
                const { error } = await supabase.from('categorias').update({ nome, descricao }).eq('id', id);
                if (error) throw error;
                showToast("Categoria atualizada com sucesso!");
            } else { // Create
                const { error } = await supabase.from('categorias').insert({ nome, descricao });
                if (error) throw error;
                showToast("Categoria criada com sucesso!");
            }
            setCategoryToEdit(null);
            setCategoryFormData(initialCategoryFormState);
            await fetchCategories();
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setIsSubmitting(false); }
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        try {
            const { data: toolsInCategory } = await supabase.from('ferramentas').select('id').eq('categoria_id', categoryToDelete.id).limit(1);
            if (toolsInCategory && toolsInCategory.length > 0) {
                alert(`Não é possível excluir "${categoryToDelete.nome}" pois existem ferramentas associadas a ela.`);
                setCategoryToDelete(null);
                return;
            }
            const { error } = await supabase.from('categorias').delete().eq('id', categoryToDelete.id);
            if (error) throw error;
            showToast("Categoria excluída com sucesso!");
            await fetchCategories();
        } catch (error: any) { alert(`Erro: ${error.message}`);
        } finally { setCategoryToDelete(null); }
    };
    
    const handleUpdateActiveUser = async (user: ActiveUser, updates: Partial<Pick<ActiveUser, 'is_active'>>) => {
        try {
            const { error } = await supabase.from('perfis').update(updates).eq('id', user.id);
            if (error) throw error;
            showToast(`Usuário ${user.nome} atualizado.`);
            await fetchActiveUsers();
        } catch (error: any) {
            alert(`Erro ao atualizar usuário: ${error.message}`);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('perfis').delete().eq('id', userToDelete.id);
            if (error) throw error;
            showToast(`Usuário ${userToDelete.nome} excluído com sucesso.`);
            await fetchActiveUsers();
        } catch (error: any) {
            alert(`Erro ao excluir usuário: ${error.message}`);
        } finally {
            setUserToDelete(null);
            setIsSubmitting(false);
        }
    };
    
    const handleOpenEditModal = async (user: ActiveUser) => {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('perfil_ferramentas')
                .select('ferramenta_id')
                .eq('perfil_id', user.id);
            
            if (error) throw error;
            
            const currentToolIds = new Set(data.map((item: any) => item.ferramenta_id));
            setSelectedTools(currentToolIds);
    
            const grouped = tools.reduce((acc, tool) => {
                const category = tool.category || 'Outros';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(tool);
                return acc;
            }, {} as Record<string, Tool[]>);
            setGroupedTools(grouped);
            setExpandedCategories(new Set());
            setUserToEdit(user);
        } catch (error: any) {
            alert(`Erro ao carregar permissões do usuário: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleConfirmEditPermissions = async () => {
        if (!userToEdit) return;
        setIsSubmitting(true);
        try {
            const { error: deleteError } = await supabase
                .from('perfil_ferramentas')
                .delete()
                .eq('perfil_id', userToEdit.id);
    
            if (deleteError) throw deleteError;
    
            if (selectedTools.size > 0) {
                const toolLinks = Array.from(selectedTools).map(toolId => ({
                    perfil_id: userToEdit.id,
                    ferramenta_id: toolId,
                }));
    
                const { error: insertError } = await supabase
                    .from('perfil_ferramentas')
                    .insert(toolLinks);
                
                if (insertError) throw insertError;
            }
    
            showToast(`Permissões de ${userToEdit.nome} atualizadas com sucesso!`);
        } catch (error: any) {
            alert(`Erro ao atualizar permissões: ${error.message}`);
        } finally {
            setUserToEdit(null);
            setIsSubmitting(false);
        }
    };

    const handleSubmitAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: { nome: string; email: string; senha?: string; is_admin: boolean, is_active: boolean } = {
                nome: adminFormData.nome,
                email: adminFormData.email,
                is_admin: true,
                is_active: true,
            };
            if (adminFormData.senha) {
                payload.senha = adminFormData.senha;
            }

            if (adminToEdit) { // Update
                if (!payload.senha) delete payload.senha; // Don't update password if empty
                const { error } = await supabase.from('perfis').update(payload).eq('id', adminToEdit.id);
                if (error) throw error;
                showToast('Administrador atualizado com sucesso!');
            } else { // Create
                if (!payload.senha) throw new Error("A senha é obrigatória para novos administradores.");
                const { error } = await supabase.from('perfis').insert(payload);
                if (error) throw error;
                showToast('Administrador adicionado com sucesso!');
            }
            await fetchAdmins();
            setActiveTab('admins');
            setAdminToEdit(null);
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAdmin = async () => {
        if (!adminToDelete) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('perfis').delete().eq('id', adminToDelete.id);
            if (error) throw error;
            showToast('Administrador excluído com sucesso!');
            await fetchAdmins();
        } catch (error: any) {
            alert(`Erro ao excluir administrador: ${error.message}`);
        } finally {
            setAdminToDelete(null);
            setIsSubmitting(false);
        }
    };

    const renderDashboard = () => (
        <div className="admin-content-panel">
            <h2>Visão Geral</h2>
            <div className="summary-cards-grid">
                <div className="summary-card"><h3>Total de Ferramentas</h3><p className="summary-card-value">{tools.length}</p><span className="summary-card-footer">{tools.filter(t => t.status === 'ativo').length} ativas</span></div>
                <div className="summary-card"><h3>Usuários Ativos</h3><p className="summary-card-value">{activeUsers.length}</p><span className="summary-card-footer">{activeUsers.filter(u => u.is_active).length} contas ativas</span></div>
                <div className="summary-card"><h3>Usuários Pendentes</h3><p className="summary-card-value">{waitingList.length}</p><span className="summary-card-footer">Aguardando aprovação</span></div>
                <div className="summary-card"><h3>Administradores</h3><p className="summary-card-value">{admins.length}</p><span className="summary-card-footer">gerenciando o sistema</span></div>
            </div>
        </div>
    );

    const renderToolsList = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>Gerenciar Ferramentas</h2><button className="login-btn" onClick={() => { setToolToEdit(null); setActiveTab('add_edit'); }}>+ Adicionar Nova</button></div>
            <div className="table-container">
                <table className="admin-table">
                    <thead><tr><th>Status</th><th>Ícone</th><th>Nome</th><th>Categoria</th><th>Nível</th><th>Ações</th></tr></thead>
                    <tbody>
                        {tools.map(tool => (
                            <tr key={tool.id}>
                                <td><span className={`status-indicator-dot ${tool.status}`}></span>{tool.status === 'ativo' ? 'Ativo' : 'Inativo'}</td>
                                <td className="tool-icon-cell">{tool.icon}</td><td>{tool.name}</td><td>{tool.category}</td><td>{tool.dificuldade}</td>
                                <td className="actions-cell">
                                    <button className="admin-btn-icon" title="Editar" onClick={() => { setToolToEdit(tool); setActiveTab('add_edit'); }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                                    <button className="admin-btn-icon delete" title="Excluir" onClick={() => setToolToDelete(tool)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderToolForm = () => (
         <div className="admin-content-panel">
             <div className="panel-header"><h2>{toolToEdit ? 'Editar Ferramenta' : 'Adicionar Nova Ferramenta'}</h2></div>
            <form onSubmit={handleSubmitTool} className="admin-panel-form">
                <div className="admin-form-grid">
                    <div className="form-group full-width"><label htmlFor="name">Nome da Ferramenta</label><input id="name" name="name" type="text" value={toolFormData.name} onChange={e => setToolFormData({...toolFormData, name: e.target.value})} required /></div>
                    <div className="form-group full-width"><label htmlFor="description">Descrição</label><textarea id="description" name="description" value={toolFormData.description} onChange={e => setToolFormData({...toolFormData, description: e.target.value})} required /></div>
                    <div className="form-group"><label htmlFor="category">Categoria</label><input id="category" name="category" type="text" value={toolFormData.category} onChange={e => setToolFormData({...toolFormData, category: e.target.value})} list="category-list" required /><datalist id="category-list">{categories.map(cat => <option key={cat.id} value={cat.nome} />)}</datalist></div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Ícone (Emoji)</label>
                        <div className="emoji-input-container"><span className="selected-emoji">{toolFormData.icon}</span><button type="button" className="emoji-select-btn" onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}>Selecionar</button></div>
                        {isEmojiPickerOpen && (<div className="emoji-picker">{EMOJIS.map(emoji => <span key={emoji} className="emoji-option" onClick={() => { setToolFormData({...toolFormData, icon: emoji}); setIsEmojiPickerOpen(false); }}>{emoji}</span>)}</div>)}
                    </div>
                    <div className="form-group full-width"><label htmlFor="link">Link de Acesso</label><input id="link" name="link" type="url" value={toolFormData.link} onChange={e => setToolFormData({...toolFormData, link: e.target.value})} required /></div>
                    <div className="form-group full-width"><label htmlFor="video">URL do Vídeo Tutorial (Opcional)</label><input id="video" name="video" type="url" value={toolFormData.video} onChange={e => setToolFormData({...toolFormData, video: e.target.value})} /></div>
                    <div className="form-group"><label htmlFor="dificuldade">Nível de Dificuldade</label><select id="dificuldade" name="dificuldade" value={toolFormData.dificuldade} onChange={e => setToolFormData({...toolFormData, dificuldade: e.target.value as any})}><option value="Básico">Básico</option><option value="Intermediário">Intermediário</option><option value="Avançado">Avançado</option></select></div>
                    <div className="form-group"><label>Status</label><div className="status-toggle-container"><label className="status-toggle"><input type="checkbox" checked={toolFormData.status === 'ativo'} onChange={e => setToolFormData({...toolFormData, status: e.target.checked ? 'ativo' : 'inativo'})} /><span className="slider round"></span></label><span className="edit-tool-status-text" style={{textTransform: 'capitalize'}}>{toolFormData.status}</span></div></div>
                </div>
                <div className="admin-panel-actions"><button type="button" onClick={() => setActiveTab('tools')} className="admin-btn secondary">Cancelar</button><button type="submit" className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Ferramenta'}</button></div>
            </form>
        </div>
    );

    const renderWaitingList = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>Lista de Espera ({waitingList.length})</h2></div>
            {waitingList.length > 0 ? (
                 <div className="table-container"><table className="admin-table">
                     <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Ações</th></tr></thead>
                     <tbody>{waitingList.map(user => (<tr key={user.id}><td>{user.nome}</td><td>{user.email}</td><td>{user.telefone}</td><td className="actions-cell"><button onClick={() => setUserToDeny(user)} className="admin-btn secondary" style={{padding: '8px 12px', margin: '0'}}>Negar</button><button onClick={() => setUserToApprove(user)} className="login-btn" style={{padding: '8px 12px', margin: '0'}}>Aprovar</button></td></tr>))}</tbody>
                 </table></div>
            ) : <p>Nenhum usuário aguardando aprovação no momento.</p>}
        </div>
    );

    const renderCategoriesPanel = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>Gerenciar Categorias</h2></div>
            <form onSubmit={handleCategorySubmit} className="admin-panel-form" style={{ marginBottom: '32px' }}>
                <div className="admin-form-grid">
                    <div className="form-group"><label htmlFor="cat-name">Nome da Categoria</label><input id="cat-name" type="text" value={categoryFormData.nome} onChange={e => setCategoryFormData({...categoryFormData, nome: e.target.value})} placeholder="Ex: Marketing Digital" required /></div>
                    <div className="form-group"><label htmlFor="cat-desc">Descrição (Opcional)</label><input id="cat-desc" type="text" value={categoryFormData.descricao} onChange={e => setCategoryFormData({...categoryFormData, descricao: e.target.value})} placeholder="Breve descrição da categoria"/></div>
                </div>
                <div className="admin-panel-actions"><button type="submit" className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : (categoryToEdit ? 'Atualizar Categoria' : 'Adicionar Categoria')}</button>{categoryToEdit && <button type="button" onClick={() => setCategoryToEdit(null)} className="admin-btn secondary">Cancelar Edição</button>}</div>
            </form>
            <div className="table-container">
                <table className="admin-table">
                    <thead><tr><th>Nome</th><th>Descrição</th><th>Ações</th></tr></thead>
                    <tbody>
                        {categories.map(cat => (<tr key={cat.id}><td>{cat.nome}</td><td>{cat.descricao || 'N/A'}</td><td className="actions-cell"><button className="admin-btn-icon" title="Editar" onClick={() => setCategoryToEdit(cat)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button className="admin-btn-icon delete" title="Excluir" onClick={() => setCategoryToDelete(cat)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td></tr>))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderActiveUsersPanel = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>Usuários Ativos ({activeUsers.length})</h2></div>
            <div className="table-container">
                <table className="admin-table">
                    <thead><tr><th>Nome</th><th>Email</th><th>Status da Conta</th><th>Ações</th></tr></thead>
                    <tbody>
                        {activeUsers.map(user => (<tr key={user.id}>
                            <td>{user.nome}</td><td>{user.email}</td>
                            <td><div className="status-toggle-container" style={{height: 'auto'}}><label className="status-toggle"><input type="checkbox" checked={user.is_active} onChange={e => handleUpdateActiveUser(user, { is_active: e.target.checked })} /><span className="slider round"></span></label><span className="edit-tool-status-text">{user.is_active ? 'Ativa' : 'Inativa'}</span></div></td>
                            <td className="actions-cell" style={{ justifyContent: 'flex-start' }}>
                                <button className="admin-btn-icon" title="Editar Permissões" onClick={() => handleOpenEditModal(user)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button className="admin-btn-icon delete" title="Excluir Usuário" onClick={() => setUserToDelete(user)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </td>
                        </tr>))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderAdminsPanel = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>Gerenciar Administradores</h2><button className="login-btn" onClick={() => { setAdminToEdit(null); setActiveTab('add_edit_admin'); }}>+ Adicionar Novo</button></div>
            <div className="table-container">
                <table className="admin-table">
                    <thead><tr><th>Nome</th><th>Email</th><th>Ações</th></tr></thead>
                    <tbody>
                        {admins.map(admin => (
                            <tr key={admin.id}>
                                <td>{admin.nome}</td><td>{admin.email}</td>
                                <td className="actions-cell">
                                    <button className="admin-btn-icon" title="Editar" onClick={() => { setAdminToEdit(admin); setActiveTab('add_edit_admin'); }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                                    <button className="admin-btn-icon delete" title="Excluir" onClick={() => setAdminToDelete(admin)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAdminForm = () => (
        <div className="admin-content-panel">
            <div className="panel-header"><h2>{adminToEdit ? 'Editar Administrador' : 'Adicionar Novo Administrador'}</h2></div>
            <form onSubmit={handleSubmitAdmin} className="admin-panel-form">
                <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-group"><label htmlFor="admin-name">Nome Completo</label><input id="admin-name" type="text" value={adminFormData.nome} onChange={e => setAdminFormData({ ...adminFormData, nome: e.target.value })} required /></div>
                    <div className="form-group"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={adminFormData.email} onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })} required /></div>
                    <div className="form-group"><label htmlFor="admin-senha">Senha</label><input id="admin-senha" type="password" value={adminFormData.senha} onChange={e => setAdminFormData({ ...adminFormData, senha: e.target.value })} placeholder={adminToEdit ? "Deixe em branco para não alterar" : ""} required={!adminToEdit} /></div>
                </div>
                <div className="admin-panel-actions">
                    <button type="button" onClick={() => setActiveTab('admins')} className="admin-btn secondary">Cancelar</button>
                    <button type="submit" className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Administrador'}</button>
                </div>
            </form>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return renderDashboard();
            case 'tools': return renderToolsList();
            case 'add_edit': return renderToolForm();
            case 'users': return renderWaitingList();
            case 'categories': return renderCategoriesPanel();
            case 'active_users': return renderActiveUsersPanel();
            case 'admins': return renderAdminsPanel();
            case 'add_edit_admin': return renderAdminForm();
            default: return <h2>Seção não encontrada</h2>;
        }
    };

    return (
        <div className="admin-dashboard-layout">
            <header className="admin-main-header">
                <div className="admin-header-left"><img src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" alt="Logo" className="admin-header-logo" /><h1>Painel do Administrador</h1></div>
                <button onClick={onLogout} className="logout-btn">Sair<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
            </header>
            <nav className="admin-nav-tabs">
                <button className={`admin-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Visão Geral</button>
                <button className={`admin-nav-tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>Ferramentas</button>
                <button className={`admin-nav-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>Categorias</button>
                <button className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Lista de Espera{waitingList.length > 0 && <span className="notification-badge">{waitingList.length}</span>}</button>
                <button className={`admin-nav-tab ${activeTab === 'active_users' ? 'active' : ''}`} onClick={() => setActiveTab('active_users')}>Usuários Ativos</button>
                <button className={`admin-nav-tab ${activeTab === 'admins' ? 'active' : ''}`} onClick={() => setActiveTab('admins')}>Administradores</button>
            </nav>
            <main className="admin-content-area">{renderContent()}</main>

            <Modal isOpen={!!toolToDelete} onClose={() => setToolToDelete(null)}>
                <div className="delete-modal"><div className="modal-header"><h2>Confirmar Exclusão</h2><p>Você tem certeza que quer excluir "<strong>{toolToDelete?.name}</strong>"?<br/>Esta ação não pode ser desfeita.</p></div><div className="modal-actions"><button onClick={() => setToolToDelete(null)} className="admin-btn secondary">Cancelar</button><button onClick={handleDeleteTool} className="login-btn confirm-delete-btn">Confirmar Exclusão</button></div></div>
            </Modal>
            
            <Modal isOpen={!!categoryToEdit} onClose={() => setCategoryToEdit(null)}>
                <div className="confirm-modal"><div className="modal-header"><h2>Editar Categoria</h2></div>
                    <form onSubmit={handleCategorySubmit} className="admin-panel-form" style={{textAlign: 'left'}}><div className="admin-form-grid" style={{gridTemplateColumns: '1fr'}}><div className="form-group"><label htmlFor="edit-cat-name">Nome da Categoria</label><input id="edit-cat-name" type="text" value={categoryFormData.nome} onChange={e => setCategoryFormData({...categoryFormData, nome: e.target.value})} required /></div><div className="form-group"><label htmlFor="edit-cat-desc">Descrição</label><input id="edit-cat-desc" type="text" value={categoryFormData.descricao} onChange={e => setCategoryFormData({...categoryFormData, descricao: e.target.value})} /></div></div><div className="modal-actions" style={{marginTop: '24px'}}><button type="button" onClick={() => setCategoryToEdit(null)} className="admin-btn secondary">Cancelar</button><button type="submit" className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</button></div></form>
                </div>
            </Modal>
            
            <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)}>
                <div className="delete-modal"><div className="modal-header"><h2>Confirmar Exclusão</h2><p>Você tem certeza que quer excluir a categoria "<strong>{categoryToDelete?.nome}</strong>"?<br/>Esta ação não pode ser desfeita.</p></div><div className="modal-actions"><button onClick={() => setCategoryToDelete(null)} className="admin-btn secondary">Cancelar</button><button onClick={handleDeleteCategory} className="login-btn confirm-delete-btn">Confirmar Exclusão</button></div></div>
            </Modal>

            <Modal isOpen={!!userToApprove} onClose={() => setUserToApprove(null)}>
                <div className="confirm-modal modal-panel" style={{maxWidth: '600px'}}>
                    <div className="modal-header">
                        <h2>Aprovar & Atribuir Ferramentas</h2>
                        <p>Selecione as ferramentas que <strong>{userToApprove?.nome}</strong> terá acesso.</p>
                    </div>
                    <div className="approval-accordion-container">
                       <div className="approval-accordion">
                            {Object.entries(groupedTools).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, toolsInCategory]) => {
                                const isExpanded = expandedCategories.has(category);
                                const selectedCount = toolsInCategory.filter(t => selectedTools.has(t.id)).length;
                                const allSelected = selectedCount > 0 && selectedCount === toolsInCategory.length;

                                return (
                                    <div key={category} className={`approval-category-item ${isExpanded ? 'expanded' : ''}`}>
                                        <button type="button" className="approval-category-header" onClick={() => toggleCategoryExpansion(category)}>
                                            <span className="category-name">{category}</span>
                                            <div className="category-details">
                                                <span className="selection-count">{selectedCount} / {toolsInCategory.length}</span>
                                                <span className="chevron">{isExpanded ? '▾' : '▸'}</span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="approval-tool-list">
                                                <div className="tool-list-item select-all">
                                                    <input
                                                        type="checkbox"
                                                        id={`select-all-${category.replace(/\s+/g, '-')}`}
                                                        checked={allSelected}
                                                        onChange={(e) => handleSelectAllToolsInCategory(toolsInCategory, e.target.checked)}
                                                    />
                                                    <label htmlFor={`select-all-${category.replace(/\s+/g, '-')}`}>Selecionar todas</label>
                                                </div>
                                                {toolsInCategory.map(tool => (
                                                    <div key={tool.id} className="tool-list-item">
                                                        <input
                                                            type="checkbox"
                                                            id={`tool-${tool.id}`}
                                                            checked={selectedTools.has(tool.id)}
                                                            onChange={() => handleToolSelection(tool.id)}
                                                        />
                                                        <label htmlFor={`tool-${tool.id}`}>{tool.name}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button onClick={() => setUserToApprove(null)} className="admin-btn secondary">Cancelar</button>
                        <button onClick={handleConfirmApproval} className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Aprovando...' : 'Confirmar Aprovação'}</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={!!userToEdit} onClose={() => setUserToEdit(null)}>
                <div className="confirm-modal modal-panel" style={{maxWidth: '600px'}}>
                    <div className="modal-header">
                        <h2>Editar Permissões</h2>
                        <p>Ajuste as ferramentas que <strong>{userToEdit?.nome}</strong> pode acessar.</p>
                    </div>
                    <div className="approval-accordion-container">
                        <div className="approval-accordion">
                            {Object.entries(groupedTools).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, toolsInCategory]) => {
                                const isExpanded = expandedCategories.has(category);
                                const selectedCount = toolsInCategory.filter(t => selectedTools.has(t.id)).length;
                                const allSelected = selectedCount > 0 && selectedCount === toolsInCategory.length;

                                return (
                                    <div key={category} className={`approval-category-item ${isExpanded ? 'expanded' : ''}`}>
                                        <button type="button" className="approval-category-header" onClick={() => toggleCategoryExpansion(category)}>
                                            <span className="category-name">{category}</span>
                                            <div className="category-details">
                                                <span className="selection-count">{selectedCount} / {toolsInCategory.length}</span>
                                                <span className="chevron">{isExpanded ? '▾' : '▸'}</span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="approval-tool-list">
                                                <div className="tool-list-item select-all">
                                                    <input
                                                        type="checkbox"
                                                        id={`edit-select-all-${category.replace(/\s+/g, '-')}`}
                                                        checked={allSelected}
                                                        onChange={(e) => handleSelectAllToolsInCategory(toolsInCategory, e.target.checked)}
                                                    />
                                                    <label htmlFor={`edit-select-all-${category.replace(/\s+/g, '-')}`}>Selecionar todas</label>
                                                </div>
                                                {toolsInCategory.map(tool => (
                                                    <div key={tool.id} className="tool-list-item">
                                                        <input
                                                            type="checkbox"
                                                            id={`edit-tool-${tool.id}`}
                                                            checked={selectedTools.has(tool.id)}
                                                            onChange={() => handleToolSelection(tool.id)}
                                                        />
                                                        <label htmlFor={`edit-tool-${tool.id}`}>{tool.name}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button onClick={() => setUserToEdit(null)} className="admin-btn secondary">Cancelar</button>
                        <button onClick={handleConfirmEditPermissions} className="login-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!userToDeny} onClose={() => setUserToDeny(null)}>
                <div className="delete-modal"><div className="modal-header"><h2>Negar Usuário</h2><p>Deseja <strong>negar acesso</strong> à ToolBox para <strong>{userToDeny?.nome}</strong>?</p></div><div className="modal-actions"><button onClick={() => setUserToDeny(null)} className="admin-btn secondary">Cancelar</button><button onClick={handleDenyUser} className="login-btn confirm-delete-btn">Confirmar</button></div></div>
            </Modal>

            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)}>
                <div className="delete-modal">
                    <div className="modal-header"><h2>Confirmar Exclusão</h2><p>Você tem certeza que quer excluir o usuário "<strong>{userToDelete?.nome}</strong>"?<br/>Esta ação é permanente e não pode ser desfeita.</p></div>
                    <div className="modal-actions">
                        <button onClick={() => setUserToDelete(null)} className="admin-btn secondary">Cancelar</button>
                        <button onClick={handleDeleteUser} className="login-btn confirm-delete-btn" disabled={isSubmitting}>{isSubmitting ? "Excluindo..." : "Confirmar Exclusão"}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!adminToDelete} onClose={() => setAdminToDelete(null)}>
                <div className="delete-modal">
                    <div className="modal-header"><h2>Confirmar Exclusão</h2><p>Você tem certeza que quer excluir o administrador "<strong>{adminToDelete?.nome}</strong>"?<br/>Esta ação não pode ser desfeita.</p></div>
                    <div className="modal-actions">
                        <button onClick={() => setAdminToDelete(null)} className="admin-btn secondary">Cancelar</button>
                        <button onClick={handleDeleteAdmin} className="login-btn confirm-delete-btn" disabled={isSubmitting}>{isSubmitting ? "Excluindo..." : "Confirmar Exclusão"}</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={!!toastMessage} onClose={() => setToastMessage('')} type="toast">{toastMessage}</Modal>
        </div>
    );
};

export default AdminPage;