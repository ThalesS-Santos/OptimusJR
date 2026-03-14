import pandas as pd
import os

# CONFIGURAÇÃO E ARQUIVO DE DADOS
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
    
    # Check if user already exists
    if not df[df['email'] == email].empty:
        return None # User already exists

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
    return new_user.to_dict('records')[0]

def authenticate_user(email, password):
    df = load_data()
    user_record = df[df['email'] == email]
    
    if not user_record.empty:
        real_password = str(user_record.iloc[0]['password'])
        if password == real_password:
            return user_record.iloc[0].to_dict()
    return None

def get_users_by_role(role, dept=None):
    df = load_data()
    if dept:
        return df[(df['role'] == role) & (df['dept'] == dept)].to_dict('records')
    return df[df['role'] == role].to_dict('records')

def get_all_users():
    df = load_data()
    return df.to_dict('records')

def update_user(target_email, new_name, new_email):
    df = load_data()
    # Check if target exists
    if df[df['email'] == target_email].empty:
        return False
    
    # Find index
    idx = df[df['email'] == target_email].index[0]
    
    # Update fields
    df.at[idx, 'name'] = new_name
    df.at[idx, 'email'] = new_email
    
    df.to_csv(DATA_FILE, index=False)
    return True
