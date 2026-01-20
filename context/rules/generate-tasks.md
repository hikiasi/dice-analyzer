# Rule: Generating a Task List for Dice Analyzer Enhancements

## Goal
To create a detailed task list for modifying the Dice Analyzer project, aligning it with new scientific and formatting requirements.

## Context Sources
- **Scientific Methodology:** `context/glava3.1.md`
- **Formatting Requirements:** `context/new.md`
- **Reference Data:** `context/recept.md`

## Process

1.  **Analyze Requirements:** Read the three context sources to understand the required changes in calculation logic and data presentation.
2.  **Identify Core Components:**
    - **Backend:** The analysis logic resides in `server/api/src/core/analyzer.py`. This is the primary file for calculation changes.
    - **Frontend:** The results are displayed in `client/components/results-panel.tsx` and visualized in `client/components/histogram-chart.tsx`.
3.  **Define High-Level Tasks:** Create parent tasks that cover:
    - Backend logic modification.
    - Frontend component updates.
    - End-to-end verification.
4.  **Generate Sub-Tasks:** Break down each parent task into specific, actionable steps. For example:
    - "Modify `analyzer.py` to scale M[X] to mass parts."
    - "Implement rounding to one decimal place."
    - "Update chart axes in `histogram-chart.tsx`."
5.  **List Relevant Files:** Create a section listing all files that will be modified, as identified in step 2.
6.  **Format and Save:** Save the complete task list to `tasks/tasks-prd-dice-analysis-enhancements.md`.
