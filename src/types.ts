export interface Tool {
    id: number;
    name: string;
    description: string;
    category: string;
    icon: string;
    link: string;
    video?: string;
    dificuldade: 'Básico' | 'Intermediário' | 'Avançado';
    tooltip: string;
    status: 'ativo' | 'inativo';
}

export interface User {
    id: string;
    name: string;
}

export interface WaitingUser {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    password: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
}

export interface ActiveUser extends User {
    id: string; // UUID from Supabase
    nome: string;
    email: string;
    nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
    is_active: boolean;
    is_admin: boolean;
}