import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialize o Supabase (substitua pelas suas chaves)
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseKey = 'SUA_CHAVE_ANON_SUPABASE';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Estados de autenticação (Login / Cadastro)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados do Painel de Clientes
  const [clientes, setClientes] = useState([]);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [valorMensal, setValorMensal] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  // Verificar sessão ativa ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // Escutar mudanças na autenticação (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar clientes sempre que houver uma sessão ativa
  useEffect(() => {
    if (session) {
      buscarClientes();
    }
  }, [session]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert('Cadastro realizado! Verifique seu e-mail se necessário ou faça login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError('E-mail ou senha incorretos.');
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function buscarClientes() {
    const { data, error } = await supabase.from('clientes').select('*').order('data_vencimento', { ascending: true });
    if (!error) setClientes(data);
  }

  async function salvarCliente(e) {
    e.preventDefault();
    
    if (editandoId) {
      await supabase.from('clientes').update({
        nome,
        whatsapp,
        valor_mensal: parseFloat(valorMensal),
        data_vencimento: dataVencimento
      }).eq('id', editandoId);
      setEditandoId(null);
    } else {
      await supabase.from('clientes').insert([{
        nome,
        whatsapp,
        valor_mensal: parseFloat(valorMensal),
        data_vencimento: dataVencimento,
        status: 'ativo'
      }]);
    }

    setNome('');
    setWhatsapp('');
    setValorMensal('');
    setDataVencimento('');
    buscarClientes();
  }

  async function deletarCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      await supabase.from('clientes').delete().eq('id', id);
      buscarClientes();
    }
  }

  function carregarParaEdicao(cliente) {
    setEditandoId(cliente.id);
    setNome(cliente.nome);
    setWhatsapp(cliente.whatsapp);
    setValorMensal(cliente.valor_mensal);
    setDataVencimento(cliente.data_vencimento);
  }

  async function renovarCliente(cliente) {
    const dataAtual = new Date(cliente.data_vencimento);
    dataAtual.setDate(dataAtual.getDate() + 30);
    const novaData = dataAtual.toISOString().split('T')[0];

    await supabase.from('clientes').update({ data_vencimento: novaData, status: 'ativo' }).eq('id', cliente.id);
    buscarClientes();
  }

  const totalFaturadoMes = clientes
    .filter(c => c.status === 'ativo')
    .reduce((acc, c) => acc + Number(c.valor_mensal), 0);

  const percentualRepasse = 1.0; 
  const valorParaEnviar = totalFaturadoMes * percentualRepasse;

  if (loadingSession) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Carregando...</div>;
  }

  // TELA DE LOGIN / CADASTRO SE NÃO HOUVER SESSÃO
  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
        <h2>{isRegistering ? 'Criar Conta' : 'Login - Painel'}</h2>
        {authError && <p style={{ color: 'red', fontSize: '14px' }}>{authError}</p>}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input 
            type="email" 
            placeholder="E-mail" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={{ padding: '10px', fontSize: '14px' }}
          />
          <input 
            type="password" 
            placeholder="Senha" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            style={{ padding: '10px', fontSize: '14px' }}
          />
          <button type="submit" style={{ background: '#3182ce', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
        <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
          {isRegistering ? 'Já tem uma conta?' : 'Não tem conta?'} {' '}
          <span 
            onClick={() => setIsRegistering(!isRegistering)} 
            style={{ color: '#3182ce', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Faça login' : 'Cadastre-se'}
          </span>
        </p>
      </div>
    );
  }

  // PAINEL COMPLETO (EXIBIDO APENAS SE LOGADO)
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Painel do Filiado</h2>
        <button onClick={logout} style={{ background: '#e53e3e', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* DASHBOARD */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '8px', flex: 1 }}>
          <h3>Faturamento Total Ativo</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>
            R$ {totalFaturadoMes.toFixed(2)}
          </p>
        </div>
        <div style={{ background: '#e6fffa', padding: '20px', borderRadius: '8px', flex: 1 }}>
          <h3>Valor a Enviar no Mês</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#234e52' }}>
            R$ {valorParaEnviar.toFixed(2)}
          </p>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      <form onSubmit={salvarCliente} style={{ background: '#fff', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>{editandoId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="Nome do Cliente" value={nome} onChange={e => setNome(e.target.value)} required style={{ padding: '8px' }} />
          <input type="text" placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ padding: '8px' }} />
          <input type="number" step="0.01" placeholder="Valor Personalizado (R$)" value={valorMensal} onChange={e => setValorMensal(e.target.value)} required style={{ padding: '8px' }} />
          <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} required style={{ padding: '8px' }} />
        </div>
        <button type="submit" style={{ background: '#3182ce', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {editandoId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </button>
        {editandoId && (
          <button type="button" onClick={() => { setEditandoId(null); setNome(''); setWhatsapp(''); setValorMensal(''); setDataVencimento(''); }} style={{ marginLeft: '10px', padding: '10px 15px', cursor: 'pointer' }}>
            Cancelar
          </button>
        )}
      </form>

      {/* LISTA DE CLIENTES */}
      <h3>Meus Clientes</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '10px', border: '1px solid #cbd5e0' }}>Nome</th>
            <th style={{ padding: '10px', border: '1px solid #cbd5e0' }}>WhatsApp</th>
            <th style={{ padding: '10px', border: '1px solid #cbd5e0' }}>Valor</th>
            <th style={{ padding: '10px', border: '1px solid #cbd5e0' }}>Vencimento</th>
            <th style={{ padding: '10px', border: '1px solid #cbd5e0' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map(cliente => (
            <tr key={cliente.id}>
              <td style={{ padding: '10px', border: '1px solid #cbd5e0' }}>{cliente.nome}</td>
              <td style={{ padding: '10px', border: '1px solid #cbd5e0' }}>{cliente.whatsapp}</td>
              <td style={{ padding: '10px', border: '1px solid #cbd5e0' }}>R$ {Number(cliente.valor_mensal).toFixed(2)}</td>
              <td style={{ padding: '10px', border: '1px solid #cbd5e0' }}>{cliente.data_vencimento.split('-').reverse().join('/')}</td>
              <td style={{ padding: '10px', border: '1px solid #cbd5e0' }}>
                <button onClick={() => renovarCliente(cliente)} style={{ marginRight: '5px', background: '#38a169', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '3px', cursor: 'pointer' }}>Renovar</button>
                <button onClick={() => carregarParaEdicao(cliente)} style={{ marginRight: '5px', background: '#d69e2e', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '3px', cursor: 'pointer' }}>Editar</button>
                <button onClick={() => deletarCliente(cliente.id)} style={{ background: '#e53e3e', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '3px', cursor: 'pointer' }}>Deletar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
