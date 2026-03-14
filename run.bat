@echo off
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting OptimusJR Server...
echo Open http://localhost:8000 in your browser.
python -m uvicorn backend.main:app --reload
pause
