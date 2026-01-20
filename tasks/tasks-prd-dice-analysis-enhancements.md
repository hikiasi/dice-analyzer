## Relevant Files

- `server/api/src/core/analyzer.py` - Core logic for statistical analysis. This file will be modified to update the calculation and formatting of M[X], Δ, A1, and A2.
- `client/components/results-panel.tsx` - Displays the statistical results. This file will be updated to correctly render the new data format.
- `client/components/histogram-chart.tsx` - Visualizes the data distribution. This file will be updated to use the new data dimensionality for its axes and tooltips.
- `client/lib/types.ts` - Contains TypeScript type definitions. May need updates to reflect changes in the API response structure.

### Notes

- The backend is a Python Flask server, and the frontend is a Next.js application.
- Backend changes must be validated to ensure they produce values at the scale and precision described in `context/new.md`.
- Frontend components should be checked to ensure they handle the new data format gracefully.

## Tasks

- [ ] 1.0 Update Backend Analysis Logic
  - [ ] 1.1 Modify `analyzer.py` to scale the Mathematical Expectation (M[X]) to represent "mass parts" (tens).
  - [ ] 1.2 Adjust the calculation of the Interval (Δ) to be in units (e.g., 2.0-8.0).
  - [ ] 1.3 Implement rounding for all statistical outputs (M[X], Δ, A1, A2) to one decimal place.
  - [ ] 1.4 Test the backend changes with sample data to confirm the output matches the requirements in `context/new.md` and `context/recept.md`.
- [ ] 2.0 Update Frontend Components
  - [ ] 2.1 Modify the `results-panel.tsx` component to correctly display the rounded and scaled values from the API.
  - [ ] 2.2 Update the `histogram-chart.tsx` component to adjust its x-axis and tooltips to the new data scale.
  - [ ] 2.3 Review and update type definitions in `client/lib/types.ts` if the API response structure has changed.
- [ ] 3.0 Verification
  - [ ] 3.1 Perform an end-to-end test by uploading an image and verifying the entire flow: backend calculation, API response, and frontend display.
  - [ ] 3.2 Confirm that all UI labels and chart details reflect the new, physically meaningful units.