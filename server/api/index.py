# api/index.py

from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# Relative imports now work because 'src' is a sibling directory.
# Vercel's Python runtime should handle this correctly.
from src.core.analyzer import ImageAnalyzer, AnalysisResult

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

from fastapi.responses import StreamingResponse
from src.core.reporter import generate_pdf_report

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
        logging.error(f"An unexpected error occurred during analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during analysis: {e}")

@app.post("/report")
async def generate_report_endpoint(result: AnalysisResult):
    """
    Generates a PDF report from analysis data.
    """
    try:
        logging.info("Generating PDF report...")
        pdf_buffer = generate_pdf_report(result)
        logging.info("PDF report generated successfully.")
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={
            "Content-Disposition": "attachment; filename=dice-analysis-report.pdf"
        })
    except Exception as e:
        logging.error(f"An unexpected error occurred during PDF generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during PDF generation: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    # Explicitly use 127.0.0.1 and add logging for debugging
    logging.info(f"Starting server on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
