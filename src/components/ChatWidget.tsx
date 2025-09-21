import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Tool, User } from '../types';

interface ChatWidgetProps {
    context: 'onboarding' | 'toolbox';
    user: User | null;
    allTools: Tool[];
    activeTools: Tool[];
    selectedCategories: string[];
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ context, user, allTools, activeTools }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ sender: 'user' | 'assistant', text: string, error?: boolean }[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    const chatRef = useRef<Chat | null>(null);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const currentCategoryRef = useRef<string | null>(null);
    
    const API_KEY = process.env.API_KEY;

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            initializeChat();
        }
    }, [isOpen, context, activeTools]);


    const initializeChat = async () => {
        if (!API_KEY) {
            console.error("API key for Gemini is not set.");
            setMessages([{ sender: 'assistant', text: "A configuração do assistente está incompleta. A chave da API não foi encontrada." }]);
            return;
        }
        
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        let systemInstruction = '';
        let initialMessage = '';
        const userName = user?.name || 'usuário';

        if (context === 'onboarding') {
            const toolKnowledge = allTools.map(tool => `- Categoria: "${tool.category}"\n  - Ferramenta: "${tool.name}"\n  - Descrição: ${tool.description}`).join('\n\n');
            systemInstruction = `Você é um assistente especialista da ToolBox Triad3, um consultor amigável e estratégico. Sua única missão é ajudar o usuário, chamado ${userName}, a montar a toolbox personalizada para resolver os problemas da empresa dele. Você tem acesso a todas as categorias e ferramentas do sistema. Aqui está a sua base de conhecimento:\n---\n${toolKnowledge}\n---\n**Suas Diretrizes de Comportamento:**\n1. **Personalidade:** Seja humano, pessoal e empático. Chame o usuário pelo nome (${userName}). Use uma linguagem natural e evite ser robótico. Utilize quebras de linha para formatar respostas longas e facilitar a leitura.\n2. **Foco na Solução:** Ouça atentamente os problemas, "dores" ou objetivos que ${userName} descrever.\n3. **Recomendações Precisas:** Com base no problema descrito, use seu conhecimento para recomendar as CATEGORIAS mais relevantes que ele deve selecionar na tela.\n4. **Mantenha o Objetivo:** Seu objetivo final é guiar o usuário para que ele SELECIONE as categorias. Você não executa as ferramentas, apenas aconselha sobre quais categorias escolher.\n5. **Não Desvie do Assunto:** Se ${userName} perguntar sobre qualquer outra coisa, gentilmente redirecione a conversa para o objetivo principal.`;
            initialMessage = `Olá, ${userName}! Sou seu assistente de configuração. Para começar, me diga: quais desafios ou 'dores' você gostaria de resolver na sua empresa? Com base nisso, posso te ajudar a selecionar as melhores categorias de ferramentas.`;
        } else { // toolbox context
            const categorySelector = document.getElementById('category-selector') as HTMLSelectElement;
            const currentCategory = categorySelector ? categorySelector.value : 'all';
            currentCategoryRef.current = currentCategory;

            const toolsForContext = currentCategory === 'all' ? activeTools : activeTools.filter(t => t.category === currentCategory);
            const toolKnowledge = toolsForContext.length > 0 ? toolsForContext.map(t => `- Ferramenta: "${t.name}"\n  - Descrição: ${t.description}`).join('\n\n') : "Nenhuma ferramenta para esta categoria.";
            const contextDescription = currentCategory === 'all' ? 'todas as suas categorias selecionadas' : `a categoria "${currentCategory}"`;
            
            systemInstruction = `Você é um assistente especialista da ToolBox Triad3, focado em ajudar o usuário, chamado ${userName}, a entender as ferramentas de ${contextDescription}.\n**Sua Missão:** Sua única função é tirar dúvidas sobre as ferramentas de ${contextDescription} listadas abaixo. Seja claro, prestativo e utilize quebras de linha para facilitar a leitura.\n**Seu Conhecimento (Apenas estas ferramentas):**\n---\n${toolKnowledge}\n---\n**Diretrizes de Comportamento:**\n1. **Especialista Focado:** Responda apenas a perguntas relacionadas às ferramentas listadas.\n2. **Mencione os Tutoriais:** Sempre que for relevante e útil, informe ao usuário que a equipe da "Triad3 Inteligência Digital" criou vídeos tutoriais para um entendimento ainda mais profundo.\n3. **Não Desvie do Assunto:** Se ${userName} perguntar sobre qualquer outra coisa (outras categorias, como adicionar ferramentas, sobre você, etc.), gentilmente redirecione a conversa para o foco atual.`;
            initialMessage = `Olá, ${userName}! Estou aqui para te ajudar com as ferramentas de ${contextDescription}. Sobre qual delas você tem alguma dúvida?`;
        }
        
        chatRef.current = ai.chats.create({ 
            model: 'gemini-2.5-flash',
            config: { systemInstruction }
        });
        setMessages([{ sender: 'assistant', text: initialMessage }]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isThinking || !chatRef.current) return;

        const userMessage = { sender: 'user' as const, text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        const thinkingMessage = { sender: 'assistant' as const, text: '...' };
        setMessages(prev => [...prev, thinkingMessage]);

        try {
            const result = await chatRef.current.sendMessageStream({ message: userMessage.text });
            let fullResponse = '';
            for await (const chunk of result) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponse += chunkText;
                    setMessages(prev => prev.map((msg, index) => 
                        index === prev.length - 1 ? { ...msg, text: fullResponse } : msg
                    ));
                }
            }
        } catch (error) {
            console.error("Gemini Error:", error);
            setMessages(prev => prev.map((msg, index) => 
                index === prev.length - 1 ? { ...msg, text: 'Desculpe, ocorreu um erro. Tente novamente.', error: true } : msg
            ));
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="chat-widget">
            <div className={`chat-window ${!isOpen ? 'hidden' : ''}`}>
                <div className="chat-header">
                    <h3>Assistente Virtual</h3>
                    <button onClick={() => setIsOpen(false)} className="chat-close-btn" aria-label="Fechar chat">&times;</button>
                </div>
                <div ref={chatBodyRef} className="chat-body">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-wrapper ${msg.sender}-wrapper`}>
                            <div className={`message-bubble ${msg.sender} ${isThinking && index === messages.length - 1 ? 'typing' : ''} ${msg.error ? 'error' : ''}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <form className="chat-footer" onSubmit={handleSend}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        disabled={isThinking}
                        aria-label="Mensagem para o chat"
                    />
                    <button type="submit" aria-label="Enviar mensagem" disabled={isThinking || !input.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
            <button onClick={() => setIsOpen(!isOpen)} className="chat-toggle-btn" aria-label="Abrir chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        </div>
    );
};

export default ChatWidget;
