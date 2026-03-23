import requests

url = "https://mffyoacmjsnvdolknemm.supabase.co/rest/v1/department_tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnlvYWNtanNudmRvbGtuZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg5MTYsImV4cCI6MjA4ODA3NDkxNn0.evcFtIFhDGku6zX5KQNnB852EOswUN6yNGwyCStIpuc",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnlvYWNtanNudmRvbGtuZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg5MTYsImV4cCI6MjA4ODA3NDkxNn0.evcFtIFhDGku6zX5KQNnB852EOswUN6yNGwyCStIpuc"
}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
