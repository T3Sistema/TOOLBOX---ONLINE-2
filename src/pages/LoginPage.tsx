import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import Modal from '../components/Modal';

type FormType = 'login' | 'register';

interface LoginPageProps {
    onLoginSuccess: (user: User) => void;
    onAdminLoginSuccess: () => void;
}

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

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onAdminLoginSuccess }) => {
    const [formType, setFormType] = useState<FormType>('login');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);


    const clearMessages = () => {
        setErrorMessage('');
    }

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        clearMessages();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const { data, error } = await supabase
                .from('perfis')
                .select('id, nome, is_active, is_admin')
                .eq('email', email)
                .eq('senha', password)
                .single();

            if (error || !data) {
                 throw new Error('Usuário ou senha incorretos.');
            }
            
            if (!data.is_active) {
                throw new Error('Sua conta está desativada. Fale com o administrador.');
            }

            if (data.is_admin) {
                onAdminLoginSuccess();
            } else {
                const user: User = { id: data.id, name: data.nome };
                onLoginSuccess(user);
            }
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        clearMessages();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const nome = formData.get('name') as string;
        const email = formData.get('email') as string;
        const telefone = formData.get('phone') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setErrorMessage("As senhas não coincidem.");
            setIsLoading(false);
            return;
        }

        try {
            const { data: profileData } = await supabase.from('perfis').select('id').eq('email', email).single();
            if (profileData) throw new Error("Este email já está cadastrado.");

            const { data: waitingData } = await supabase.from('lista_de_espera').select('id').eq('email', email).eq('status', 'pendente').single();
            if (waitingData) throw new Error("Este email já está na lista de espera.");

            const { error } = await supabase.from('lista_de_espera').insert({ nome, email, telefone, password: password });
            if (error) throw error;
            
            setShowSuccessModal(true);
            form.reset();

        } catch (error: any) {
            setErrorMessage(error.message || "Ocorreu um erro no cadastro.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderForm = () => {
        switch (formType) {
            case 'login':
                return (
                    <div className="login-container">
                        <img src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" alt="Logo Triad3" className="login-logo" />
                        <h1>ToolBox Triad3</h1>
                        <form className="login-form" onSubmit={handleLogin}>
                            <div className="input-group">
                                <input type="email" name="email" placeholder="Email" required />
                            </div>
                            <div className="input-group">
                                <input type={showPassword ? "text" : "password"} name="password" placeholder="Senha" required />
                                <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                            </div>
                            <button type="submit" className="login-btn" disabled={isLoading}>
                                {isLoading ? 'Verificando...' : 'Entrar'}
                            </button>
                            {errorMessage && <p className="error-message" style={{opacity: 1}}>{errorMessage}</p>}
                        </form>
                        <div className="login-separator"><span>ou</span></div>
                        <div className="login-actions">
                            <button type="button" onClick={() => { setFormType('register'); clearMessages(); }} className="admin-btn">Criar nova conta</button>
                        </div>
                    </div>
                );
            case 'register':
                return (
                     <div className="login-container">
                         <img src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" alt="Logo Triad3" className="login-logo" />
                         <h1>Crie sua Conta</h1>
                         <p style={{marginBottom: '24px', color: 'var(--color-text-secondary)'}}>Preencha seus dados para solicitar acesso.</p>
                         <form className="login-form" onSubmit={handleRegister}>
                            <div className="input-group">
                                <input type="text" name="name" placeholder="Nome completo" required />
                            </div>
                            <div className="input-group">
                                <input type="email" name="email" placeholder="Seu melhor email" required />
                            </div>
                             <div className="input-group">
                                <input type="tel" name="phone" placeholder="Telefone (WhatsApp)" required />
                            </div>
                            <div className="input-group">
                                <input type={showPassword ? "text" : "password"} name="password" placeholder="Crie sua senha" required />
                                <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                            </div>
                             <div className="input-group">
                                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirme sua senha" required />
                                <PasswordToggle isVisible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                            </div>
                            <button type="submit" className="login-btn" disabled={isLoading}>
                                {isLoading ? 'Enviando...' : 'Solicitar Acesso'}
                            </button>
                             {errorMessage && <p className="error-message" style={{opacity: 1}}>{errorMessage}</p>}
                         </form>
                         <button type="button" onClick={() => { setFormType('login'); clearMessages(); }} className="switch-form-btn">Já tem uma conta? Entrar</button>
                     </div>
                );
        }
    }

    return (
        <main className="login-page">
           {renderForm()}
            <Modal 
                isOpen={showSuccessModal} 
                onClose={() => {
                    setShowSuccessModal(false);
                    setFormType('login');
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '50%',
                        width: '64px',
                        height: '64px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    </div>
                    <div className="modal-header" style={{padding: 0}}>
                        <h2 style={{color: 'var(--color-text)'}}>Sucesso!</h2>
                        <p style={{marginTop: '12px', color: 'var(--color-text-secondary)', fontSize: '1rem'}}>Cadastro realizado com sucesso! Aguarde a aprovação do administrador.</p>
                    </div>
                    <div className="modal-actions" style={{marginTop: '24px'}}>
                        <button 
                            className="login-btn" 
                            style={{ backgroundColor: '#22c55e', minWidth: '120px' }} 
                            onClick={() => {
                                setShowSuccessModal(false);
                                setFormType('login');
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
};

export default LoginPage;