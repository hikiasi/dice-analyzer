# backend/main.py

from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add src to python path to allow imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from core.analyzer import ImageAnalyzer, AnalysisResult

app = FastAPI(
    title="DICE Analyzer API",
    description="API for Information-Entropy Analysis of SEM images.",
    version="1.0.0",
)

# Configure CORS
origins = [
    "http://localhost:3000",  # Allow your Next.js frontend
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = ImageAnalyzer()

@app.get("/")
async def read_root():
    return {"message": "DICE Analyzer Backend is running!"}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_image_endpoint(
    file: UploadFile,
    material: str = Form(...),
    magnification: str = Form(...),
    grid_size: int = Form(...),
):
    """
    Analyzes an uploaded SEM image to assess homogeneity.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()
        
        # Perform the analysis using the dedicated analyzer class
        result = analyzer.analyze(
            image_bytes=image_bytes,
            material=material,
            magnification=magnification,
            grid_size=grid_size,
        )
        return result

    except ValueError as ve:
        # Handle specific known errors (e.g., unknown material)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during analysis: {e}")
