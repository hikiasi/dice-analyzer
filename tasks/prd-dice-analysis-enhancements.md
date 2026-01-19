# Product Requirements Document: DICE Analyzer Enhancements

## 1. Introduction/Overview
This document outlines the requirements for enhancing the DICE Analyzer application. The primary goal is to improve the accuracy, detail, and reporting capabilities of the information-entropy analysis of SEM images. This involves implementing a dedicated Python backend for robust calculations, updating the core scientific formulas, and expanding the frontend to provide more comprehensive results and export options.

## 2. Goals
- **G-1:** Implement a reliable backend service using Python and FastAPI to handle all computationally intensive image analysis tasks.
- **G-2:** Ensure the analysis is scientifically accurate by updating the calculation logic to use the correct, more complex formulas from the provided methodological guide (`Method_algorithm.md`).
- **G-3:** Enhance the user interface to display detailed per-cell data, giving the researcher full visibility into the analysis results.
- **G-4:** Provide flexible data export options, including a raw data format (CSV) for external analysis and a polished, professional report (PDF).
- **G-5:** Improve the overall detail and presentation of the final analysis summary to make it more valuable for research and reporting.

## 3. User Stories
- **US-1:** As a researcher, I want to upload an SEM image and select its corresponding material parameters to receive a fast and accurate homogeneity analysis based on the correct scientific method.
- **US-2:** As a researcher, I want to see the detailed concentration data and other metrics for all 225 cells of the analysis grid to better understand the distribution of technical carbon.
- **US-3:** As a researcher, I want to download the raw per-cell data as a CSV file so I can perform my own statistical analysis or visualizations in external tools like Excel or R.
- **US-4:** As a researcher, I want to download a comprehensive, professionally formatted PDF report that summarizes the analysis, includes key visuals (histogram, concentration map), and presents a clear final conclusion, suitable for inclusion in papers or presentations.

## 4. Functional Requirements

### Backend & Analysis
- **FR-1:** A new sub-directory named `backend` will be created to house a Python FastAPI application.
- **FR-2:** The FastAPI application will have a primary API endpoint (e.g., `/analyze/`).
- **FR-3:** This endpoint will accept an uploaded image file and JSON data containing analysis parameters (material, magnification, grid size).
- **FR-4:** The backend will perform the full analysis pipeline:
    - Load and preprocess the image (convert to grayscale).
    - Divide the image into the specified grid (e.g., 15x15).
    - Calculate the average gray level for each cell.
    - Convert gray level to concentration using the appropriate calibration coefficients.
    - Calculate all statistical parameters (M[X], H(P), etc.).
- **FR-5 (Critical):** The calculation for the information-entropy interval boundaries (`A1`, `A2`) **must** be updated to use the complex formulas (3 and 4) from `Method_algorithm.md`, not the simpler version currently in the Python example code.
- **FR-6:** The API endpoint will return a detailed JSON object containing the full analysis results, including the per-cell data array.

### Frontend & UI
- **FR-7:** The frontend will be updated to send analysis requests to the new FastAPI backend endpoint instead of performing calculations in the browser.
- **FR-8:** A new tab or section will be added to the results panel to display a grid/table with the data for all 225 cells. Each row should show the cell's coordinates, average brightness, calculated concentration, and whether it falls within the [A1, A2] interval.
- **FR-9:** The existing histogram chart will be enhanced to be more detailed and must clearly render vertical lines or a shaded region indicating the mathematical expectation (`M[X]`) and the `A1` and `A2` boundaries.
- **FR-10:** A "Download CSV" button will be added to the results panel. Clicking it will generate and trigger a download of a CSV file containing the per-cell data, mirroring the structure from `result_issledovaniya_km_metodami.md`.
- **FR-11:** A "Download PDF" button will be added. Clicking it will generate a multi-page PDF report containing:
    - Input parameters (filename, material, etc.).
    - A summary table of key results (D_IEI, M[X], H(P), A1, A2).
    - The final homogeneity grade, verdict, and detailed suitability text.
    - Embedded images of the histogram and the grid visualization/concentration map.

## 5. Non-Goals (Out of Scope)
- The application will not have user accounts or a database to store historical analysis results. Each analysis is independent and session-based.
- The application will not automatically detect analysis parameters from image metadata. All parameters must be manually selected by the user.
- The data from `result_issledovaniya_km_metodami.md` will be used as a structural reference but will not be implemented as an interactive, pre-loadable demo.

## 6. Technical Considerations
- **Backend:** Python 3.9+, FastAPI, python-multipart, Pillow (for image processing), NumPy, SciPy.
- **Frontend-Backend Communication:** The Next.js app will use the `fetch` API to make `POST` requests with `multipart/form-data` to the FastAPI backend. CORS will need to be correctly configured on the backend.
- **PDF Generation:** A client-side library like `jsPDF` combined with `jspdf-autotable` will be used to generate the PDF report dynamically from the results data.
- **CSV Generation:** A simple client-side function or a lightweight library like `papaparse` will be used to create and download the CSV file.
- **Development:** The backend FastAPI server and frontend Next.js app will need to be run concurrently during development.

## 7. Open Questions
- What are the exact mathematical definitions for the variables `d`, `n`, and `n_i` in the complex formulas (3 and 4) from `Method_algorithm.md`? This needs to be clarified before implementation.
