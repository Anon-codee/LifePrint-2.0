# LifePrint 🧬

### A Personalized Health Digital Twin Using AI & Dynamic Health Graphs

LifePrint is a research prototype that explores how longitudinal personal health data can be used to learn individual-specific patterns and generate personalized, explainable health-event predictions.

## Architecture

The project has been refactored to separate the Python intelligence layer from the frontend in preparation for a React + FastAPI architecture.

```
Data
  ↓
Data Loader (data/loader.py)
  ↓
Analytics (services/analytics.py)
  ↓
Prediction (services/prediction.py)
  ↓
Graph (services/graph.py)
  ↓
What-If (services/what_if.py)
  ↓
UI (app.py - Streamlit Adapter)
```

## Current Prototype

The prototype currently demonstrates:

- Synthetic longitudinal health data generation
- Personal health baselines
- Individual pattern discovery
- Health-event prediction
- Explainable predictions
- Personal Health Knowledge Graph
- What-If health simulation

## Tech Stack

- Python
- Streamlit
- Pandas
- NumPy
- Scikit-learn
- Plotly
- NetworkX

## Disclaimer

LifePrint is an academic research prototype and is not intended for medical diagnosis or treatment.

All health data currently used by the prototype is synthetic.

## Status

🚧 Prototype under active development.