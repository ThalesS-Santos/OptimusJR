import streamlit as st
import pandas as pd
import os

# 1. CONFIGURAÇÃO E ARQUIVO DE DADOS
DATA_FILE = "usuarios.csv"

# Função para carregar usuários do arquivo
def load_data():
    if not os.path.exists(DATA_FILE):
        # Cria o arquivo se não existir
        df = pd.DataFrame(columns=["email", "password", "name", "role", "dept"])
        df.to_csv(DATA_FILE, index=False)
        return df
    return pd.read_csv(DATA_FILE)

# Função para salvar novo usuário
def save_user(email, password, name, role, dept):
    df = load_data()
    new_user = pd.DataFrame({
        "email": [email],
        "password": [password],
        "name": [name],
        "role": [role],
        "dept": [dept]
    })
    # Concatena e salva
    df = pd.concat([df, new_user], ignore_index=True)
    df.to_csv(DATA_FILE, index=False)
    return df

# 2. SISTEMA DE LOGIN INTELIGENTE
def login_page():
    st.title("🔐 Sistema EJ - Acesso")
    
    # Passo 1: Digitar o email
    email = st.text_input("Digite seu E-mail institucional")
    
    if email:
        df = load_data()
        user_record = df[df['email'] == email]
        
        # CENÁRIO A: Usuário já existe (Login normal)
        if not user_record.empty:
            st.info(f"Bem-vindo de volta, {user_record.iloc[0]['name']}!")
            password = st.text_input("Senha", type="password")
            
            if st.button("Entrar"):
                real_password = str(user_record.iloc[0]['password']) # Converte para string para garantir
                if password == real_password:
                    st.session_state["logged_in"] = True
                    st.session_state["user_info"] = user_record.iloc[0].to_dict()
                    st.rerun()
                else:
                    st.error("Senha incorreta.")
        
        # CENÁRIO B: Usuário novo (Cadastro)
        else:
            st.warning("E-mail não encontrado. Realizando PRIMEIRO ACESSO.")
            with st.form("register_form"):
                st.write("Complete seus dados para configurar seu perfil:")
                new_name = st.text_input("Nome Completo")
                new_pass = st.text_input("Crie uma Senha", type="password")
                
                col1, col2 = st.columns(2)
                with col1:
                    new_role = st.selectbox("Seu Cargo", ["Presidente", "Diretor", "Membro"])
                with col2:
                    new_dept = st.selectbox("Seu Departamento", ["Geral", "Marketing", "Projetos", "Financeiro", "RH"])
                
                submit = st.form_submit_button("Cadastrar e Entrar")
                
                if submit:
                    if new_name and new_pass:
                        save_user(email, new_pass, new_name, new_role, new_dept)
                        st.success("Cadastro realizado! Por favor, clique no botão abaixo para logar.")
                        # Auto-login após cadastro
                        st.session_state["logged_in"] = True
                        st.session_state["user_info"] = {
                            "email": email, "password": new_pass, 
                            "name": new_name, "role": new_role, "dept": new_dept
                        }
                        st.rerun()
                    else:
                        st.error("Preencha todos os campos obrigatórios.")

def logout():
    st.session_state["logged_in"] = False
    st.session_state["user_info"] = None
    st.rerun()

# 3. VIEWS (Telas baseadas no CSV carregado)

def view_presidente():
    st.header(f"🏛️ Painel do Presidente: {st.session_state['user_info']['name']}")
    
    # Carrega dados atualizados do CSV
    df = load_data()
    
    st.subheader("Análise de Diretores")
    directors = df[df['role'] == 'Diretor']
    
    if directors.empty:
        st.info("Nenhum diretor cadastrado ainda.")
    else:
        selected_dir = st.selectbox("Selecione um Diretor:", directors['name'])
        if selected_dir:
            dir_data = directors[directors['name'] == selected_dir].iloc[0]
            st.write(f"Departamento: **{dir_data['dept']}** | Email: {dir_data['email']}")
            st.text_area(f"Avaliação para {selected_dir}")
            if st.button("Enviar Feedback"):
                st.success("Feedback registrado!")

    st.divider()
    st.write("### Todos os Membros da EJ")
    st.dataframe(df[['name', 'email', 'role', 'dept']])

def view_diretor():
    user = st.session_state['user_info']
    my_dept = user['dept']
    st.header(f"📈 Painel do Diretor de {my_dept}: {user['name']}")
    
    df = load_data()
    
    # Filtra membros DO MEU departamento
    my_members = df[(df['role'] == 'Membro') & (df['dept'] == my_dept)]
    
    if my_members.empty:
        st.warning(f"Nenhum membro cadastrado em {my_dept} ainda.")
    else:
        st.subheader("Gerenciar Equipe")
        st.table(my_members[['name', 'email']])
        
        selected_mem = st.selectbox("Avaliar Membro:", my_members['name'])
        st.slider(f"Nota para {selected_mem}", 0, 10)
        if st.button("Salvar Nota"):
            st.success("Salvo!")

def view_membro():
    user = st.session_state['user_info']
    st.header(f"👤 Área do Membro: {user['name']}")
    st.info(f"Departamento: {user['dept']}")
    st.write("Suas tarefas e feedbacks aparecerão aqui.")

# 4. CONTROLADOR PRINCIPAL
if "logged_in" not in st.session_state:
    st.session_state["logged_in"] = False

if not st.session_state["logged_in"]:
    login_page()
else:
    # Sidebar
    with st.sidebar:
        st.write(f"Usuário: **{st.session_state['user_info']['name']}**")
        st.write(f"Cargo: `{st.session_state['user_info']['role']}`")
        if st.button("Sair"):
            logout()
    
    # Roteamento
    role = st.session_state['user_info']['role']
    
    if role == "Presidente":
        view_presidente()
    elif role == "Diretor":
        view_diretor()
    elif role == "Membro":
        view_membro()
    else:
        st.error("Erro no cadastro de cargo.")
