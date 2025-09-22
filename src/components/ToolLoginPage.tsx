import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

interface ToolLoginPageProps {
    user: User;
    toolName: string;
    onSuccess: () => void;
    onCancel: () => void;
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

const ToolLoginPage: React.FC<ToolLoginPageProps> = ({ user, toolName, onSuccess, onCancel }) => {
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        
        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const email = user.email; // Use the email from the logged-in user

        try {
            const { data, error } = await supabase
                .from('perfis')
                .select('id')
                .eq('email', email)
                .eq('senha', password)
                .single();

            if (error || !data) {
                 throw new Error('Senha incorreta.');
            }
            
            // If successful, call the onSuccess callback
            onSuccess();

        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-page">
            <div className="login-container">
                <button onClick={onCancel} style={{position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', fontSize: '1.5rem', color: 'var(--color-text-secondary)', cursor: 'pointer'}}>&times;</button>
                <img src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" alt="Logo Triad3" className="login-logo" />
                <h1 style={{fontSize: '1.5rem'}}>Acessar {toolName}</h1>
                <p style={{marginBottom: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem'}}>Para sua segurança, confirme sua identidade.</p>
                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <input type="email" name="email" value={user.email} readOnly disabled />
                    </div>
                    <div className="input-group">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            placeholder="Sua senha" 
                            required 
                            autoFocus
                        />
                        <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                    </div>
                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? 'Verificando...' : 'Entrar'}
                    </button>
                    {errorMessage && <p className="error-message" style={{opacity: 1, marginTop: '24px'}}>{errorMessage}</p>}
                </form>
            </div>
        </main>
    );
};

export default ToolLoginPage;