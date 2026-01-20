# PRD: Dice Analysis Enhancements

## 1. Overview

This document outlines requirements for enhancing the Dice Analysis tool. The primary goal is to align the backend calculations and frontend data presentation with the specific methodology described in a dissertation's Chapter 3.1 and to match the data formats specified by new customer requirements.

## 2. Background

The customer is generally satisfied but requires changes to make the tool's output directly comparable to their scientific research and established recipes. The current output uses abstract coefficients, which need to be converted into physically meaningful units with specific formatting.

- **Source of Truth for Logic:** Chapter 3.1 of the provided dissertation (`context/glava3.1.md`).
- **Source for Formatting:** Customer request summary (`context/new.md`).
- **Reference Data:** Recipe cards (`context/recept.md`) provide expected values for "mass parts" of carbon black (ТУ).

## 3. Functional Requirements

### 3.1. Backend Calculation Adjustment

- **FR-1: Update Statistical Logic:** The core analysis logic in `server/api/src/core/analyzer.py` must be updated to produce statistical outputs that align with the physical units described in the source materials.
- **FR-2: Correct Dimensionality:**
    - The **Mathematical Expectation (M[X])** must be calculated and returned in **tens**, representing "mass parts of carbon black (ТУ) per 100 mass parts of rubber". Expected values are in the range of 45.0, 58.0, 74.8, etc.
    - The **Interval (Δ)** must be calculated and returned in **units**, representing the spread around the mean. Expected values are in the range of 2.0 to 8.0.
- **FR-3: Implement Rounding:** All primary statistical outputs (`M[X]`, `Δ`, `A1`, `A2`) must be rounded to **one decimal place**.

### 3.2. Frontend Display Updates

- **FR-4: Display Corrected Values:** The frontend application must correctly display the newly formatted values received from the backend. This includes the results panel and any related charts.
- **FR-5: Update Labels and Tooltips:** All UI labels, chart axes, and tooltips related to the statistical outputs must be updated to reflect the new units (e.g., "Массовые части, м.ч." instead of a generic "Value").

## 4. Non-Functional Requirements

- **NFR-1: Maintain Performance:** The backend processing time should not significantly increase after the logic changes.
- **NFR-2: Code Quality:** All changes must adhere to existing project conventions, style, and structure.

## 5. Relevant Files for Implementation

- **Backend:** `server/api/src/core/analyzer.py` (Primary logic)
- **Frontend:**
    - `client/app/page.tsx` (Main page structure)
    - `client/components/results-panel.tsx` (Component for displaying results)
    - `client/components/histogram-chart.tsx` (Component for visualizing data distribution)
- **Types:** `client/lib/types.ts` (If any frontend type definitions need to be updated)