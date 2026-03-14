import json
import os

DATA_FILE = "data.json"

DEFAULT_DATA = {
    "finance": {
        "revenue": 45200,
        "average_ticket": 3100,
        "net_profit": 12050,
        "expenses": [
            {"description": "Hospedagem AWS", "date": "2026-01-25", "value": 150.00, "category": "Infra"},
            {"description": "Confraternização", "date": "2026-01-20", "value": 400.00, "category": "RH"},
            {"description": "Material de Escritório", "date": "2026-01-15", "value": 89.90, "category": "Operacional"}
        ]
    },
    "projects": [
        {"name": "Projeto Alpha (Consultoria)", "client": "Indústria XYZ", "status": "Em Andamento"},
        {"name": "App Delivery (Dev)", "client": "Restaurante ABC", "status": "Planejamento"}
    ]
}

def load_data():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump(DEFAULT_DATA, f, indent=4)
        return DEFAULT_DATA
    
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(key, new_data):
    data = load_data()
    data[key] = new_data
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    return data[key]

def get_data(key):
    data = load_data()
    return data.get(key, {})
