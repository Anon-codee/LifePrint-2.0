# LifePrint 2.0 — AI-Powered Personal Health Digital Twin

LifePrint 2.0 is an AI-powered personal health monitoring prototype that explores how personalized health baselines, machine learning, and longitudinal health data analysis can help individuals understand their health patterns. The system combines adaptive baselines, condition-aware monitoring, experimental risk estimation, and interactive what-if analysis in a unified web application.

> **Disclaimer:** LifePrint is an educational and research prototype. Its current demonstration uses synthetic health data and has not been clinically validated. Predictions are experimental estimates, not medical diagnoses, and must not be used as a substitute for professional medical advice.

## Table of Contents

- [Team and Institution](#team-and-institution)
- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Healthcare Use Case](#healthcare-use-case)
- [Proposed Solution](#proposed-solution)
- [Key Features](#key-features)
- [Technical Stack](#technical-stack)
- [AI/ML Model Details](#aiml-model-details)
- [Adaptive Digital Twin](#adaptive-digital-twin)
- [System Architecture](#system-architecture)
- [Prototype Demonstration](#prototype-demonstration)
- [Architecture Diagram](#architecture-diagram)
- [Project Presentation](#project-presentation)
- [Installation and Setup](#installation-and-setup)
- [Testing](#testing)
- [Current Outcomes](#current-outcomes)
- [Limitations](#limitations)
- [Future Scope](#future-scope)
- [Open-Source License](#open-source-license)
- [Project Links](#project-links)

## Team and Institution

| Detail | Information |
|---|---|
| Team Name | CodeDense |
| Team Members | Suchet Mahamuni, Kritika Parashar |
| Institution | Vishwakarma Institute of Technology, Pune |
| Department | Computer Science |
| Contact Email | suchet.mahamuni24@vit.edu |

## Project Overview

LifePrint explores a personalized approach to health monitoring using a digital twin concept. Rather than relying exclusively on generic reference values, the prototype establishes historical baselines for supported health signals and tracks deviations from an individual's own observations.

The application combines data processing, machine learning, baseline maturity assessment, condition-aware configuration, and interactive visualization to demonstrate how longitudinal health observations can be explored over time.

The current implementation is designed for prototype evaluation and reproducible experimentation, not clinical deployment.

## Problem Statement

Traditional health monitoring systems often present isolated measurements, generic reference ranges, or disconnected historical records. These approaches may not adequately communicate how an individual's observations change over time or how recent readings compare with their personal historical patterns.

There is a need for accessible tools that can organize longitudinal health observations, establish personalized reference baselines, identify unusual patterns, and let users explore how changes in selected signals affect model-generated estimates.

LifePrint addresses this problem by combining personalized baseline analysis, a condition-aware digital twin prototype, machine learning, and interactive what-if analysis.

## Healthcare Use Case

LifePrint demonstrates a potential workflow for exploring personal health observations over time.

Potential use cases include:

- **Personalized monitoring:** Compare recent observations with historical personal baselines.
- **Pattern exploration:** Examine relationships between signals such as sleep, activity, hydration, stress, and heart rate.
- **Experimental risk estimation:** Explore model-generated estimates for selected health-related outcomes.
- **What-if analysis:** Change selected input values and observe how the model output responds.
- **Condition-aware monitoring:** Configure the prototype around supported monitoring conditions and their relevant signals.
- **Data-quality awareness:** Understand when observations are insufficient, missing, stale, or unsuitable for reliable baseline calculation.

These use cases illustrate prototype functionality. They do not establish clinical effectiveness, and observed associations must not be interpreted as proof of causation.

## Proposed Solution

LifePrint integrates a React-based frontend with a Python FastAPI backend. The backend processes health observations, calculates personalized baselines, manages condition configuration, and generates experimental machine learning estimates.

The system provides an interactive dashboard where users can explore current readings, historical trends, deviations from personal baselines, condition-specific summaries, and what-if scenarios.

The prototype uses synthetic health data so that its software behavior can be demonstrated without requiring real personal medical records.

## Key Features

### 1. Adaptive Personal Baselines

- Calculates historical reference values for supported health signals.
- Supports rolling historical windows and optional recency-weighted calculations.
- Validates observations and handles duplicate dates.
- Reports baseline maturity and data-quality information.
- Identifies persistent deviations using configurable rules.

### 2. Condition-Aware Digital Twin

- Supports configured monitoring conditions.
- Selects relevant primary and supporting signals for each condition.
- Displays baseline comparisons and condition-specific summaries.
- Tracks data freshness and baseline maturity.

### 3. Random Forest Health Outcome Estimates

- Uses Scikit-learn classification models to estimate selected synthetic health-related outcomes.
- Processes supported health features through backend prediction services.
- Presents outputs as experimental model estimates rather than diagnoses.

### 4. What-If Analysis

- Allows selected input values to be varied.
- Compares model outputs under different input scenarios.
- Supports exploratory investigation of model behavior.

What-if results indicate how the model responds to changed inputs; they do not establish that changing a particular signal will cause a real-world health outcome.

### 5. Health Timelines and Graphs

- Presents longitudinal health observations.
- Supports trend and relationship exploration.
- Provides visual interfaces for examining health signals and their patterns.

### 6. Persistent User Profiles

- Stores prototype user configuration in a local JSON-based profile store.
- Supports retrieving and updating configured monitoring conditions.
- Uses a lightweight persistence approach suitable for demonstration, rather than production-grade multi-user storage.

## Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | User interface |
| Language | TypeScript | Frontend type safety |
| Build tooling | Vite | Development and production builds |
| Styling | Tailwind CSS | UI styling |
| Backend | Python | Application and data-processing logic |
| API framework | FastAPI | REST API endpoints |
| Data processing | Pandas | Dataset processing and transformations |
| Machine learning | Scikit-learn | Classification and prediction |
| Classification model | Random Forest | Experimental health-related outcome estimation |
| Graph visualization | React Flow | Interactive graph-oriented interfaces |
| Graph analysis | NetworkX | Graph data structures and analysis |
| Persistence | JSON | Local prototype profile storage |
| Testing | Pytest | Backend and API tests |
| Dataset format | CSV | Synthetic health observations |

## AI/ML Model Details

LifePrint uses Random Forest classification models implemented with Scikit-learn.

The reported prototype configuration includes:

- Seven classification models for selected outcomes.
- 150 trees per Random Forest.
- Class weighting to help address class imbalance.
- A minimum leaf size of three samples.
- Health-related input features drawn from the supported dataset.

### Dataset

The prototype dataset contains 1,200 synthetic observations covering eight demo user profiles, with 150 days per profile. It includes 14 health signals and seven outcome labels.

Examples of health signals include:

- Sleep duration and sleep quality
- Hydration and caffeine intake
- Stress and activity steps
- Heart rate and resting heart rate
- Systolic and diastolic blood pressure
- Weight and body temperature
- Calories and recovery

Example modeled outcomes include headache, blood pressure elevation, fatigue, dehydration risk, poor sleep, stress overload, and recovery deterioration.

### Model Limitations

The dataset is synthetic, and some outcome labels are derived from same-day input features. Consequently, model behavior on this dataset cannot establish real-world predictive accuracy, clinical validity, or causal relationships.

No claims of clinically validated performance are made. Clinical application would require appropriately sourced data, rigorous evaluation, calibration, bias assessment, privacy safeguards, and expert oversight.

## Adaptive Digital Twin

The adaptive digital twin component compares observations against historical personal baselines and reports the maturity and quality of the available data.

### Baseline Maturity

The prototype uses four baseline maturity categories:

- **Insufficient:** Too few valid historical observations.
- **Provisional:** An initial baseline is available.
- **Developing:** Additional historical observations are being accumulated.
- **Established:** The configured sample-density threshold has been reached.

An established baseline reflects the prototype's observation-count criteria. It does not imply clinical validation or medical reliability.

### Baseline Processing

The baseline engine supports:

- Historical rolling windows.
- Observation-date deduplication.
- Physical-range validation for supported signals.
- Missing and invalid observation counts.
- Optional exponential recency weighting.
- Persistent-deviation detection.
- Data freshness metadata.

The system is designed to make limitations in the available history visible rather than treating every computed baseline as equally reliable.

## System Architecture

LifePrint follows a frontend–backend architecture.

1. **User interface:** The React application provides dashboards, timelines, condition selection, and what-if controls.
2. **API client:** Frontend requests communicate with the backend through the configured API client.
3. **FastAPI backend:** API routes handle supported health-data, baseline, prediction, condition, profile, and what-if operations.
4. **Data processing:** Pandas supports loading and processing health observations from the synthetic CSV dataset.
5. **Baseline engine:** Calculates historical reference values, data-quality indicators, and deviations.
6. **Digital twin services:** Combine baseline information, condition configuration, freshness metadata, and structured insights.
7. **Machine learning services:** Scikit-learn Random Forest models generate experimental outcome estimates.
8. **Profile persistence:** A local JSON-based store retains prototype user configuration.
9. **Results visualization:** API responses are displayed in the frontend dashboard and related visual interfaces.

## Prototype Demonstration

**Demonstration Video (20+ minutes):** [Link](https://drive.google.com/file/d/1kQtuHBW9kCBv-0wB--bkDs4Sdxd3Q7nC/view?usp=sharing)

## Architecture Diagram

[**View LifePrint 2.0 Architecture Diagram (PDF/PPT)**](https://drive.google.com/file/d/1yhT5a9c93pQe21h9ep-xG_rGM41Au8_I/view?usp=sharing)

## Project Presentation

[**View LifePrint 2.0 Presentation (Google Slides)**](https://docs.google.com/presentation/d/13bgLzF6DdfERaVwN8Yw9j9-MP5S1ixoE/edit?usp=sharing&ouid=114865145327612651503&rtpof=true&sd=true)

## Installation and Setup

### Prerequisites

- Python 3.10 or later, compatible with the installed dependencies.
- Node.js and npm.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/Anon-codee/LifePrint-2.0.git
cd LifePrint-2.0
```

### 2. Set Up the Python Environment

On Windows:

```powershell
python -m venv venv
.\venv\Scripts\activate
```

Install the backend dependencies using the dependency file included in the repository. For example, if the project contains `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 3. Start the Backend

From the repository root, with the virtual environment activated:

```bash
uvicorn main:app --reload
```

The local API documentation should be available at:

`http://127.0.0.1:8000/docs`

### 4. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal.

**Configuration note:** Ensure the frontend API base URL points to the backend you intend to use. If your local dependency file or startup configuration differs, follow the configuration included in the repository.

## Testing

The backend uses Pytest for testing API behavior and core functionality, including baseline processing, condition configuration, profile persistence, and digital twin status.

Run the test suite from the project root:

```bash
python -m pytest -q
```

Build the frontend for production:

```bash
cd frontend
npm run build
```

The development process has reported successful backend test runs and frontend production builds. Re-run these commands against the final submitted commit to verify its state.

Passing software tests validates the tested software behavior, not clinical accuracy or safety.

## Current Outcomes

The current prototype brings several capabilities together in one application:

- Personalized historical baseline calculation.
- Baseline maturity and data-quality reporting.
- Persistent-deviation detection.
- Condition-aware digital twin configuration.
- Random Forest estimates for selected synthetic health-related outcomes.
- Interactive what-if analysis.
- Health timelines and graph-oriented visualization.
- Persistent prototype user configuration.

These are software and prototype outcomes. The project has not established improved patient outcomes, clinical accuracy, or medical effectiveness.

## Limitations

- The current demonstration uses synthetic health data.
- Machine learning outputs have not been clinically validated.
- Some synthetic outcome labels are derived from input features, which limits the conclusions that can be drawn from model results.
- Correlations and model outputs do not establish causation.
- Local JSON profile persistence is a prototype implementation, not production-grade secure multi-user storage.
- The application is not a medical device and must not be used for diagnosis or treatment decisions.
- Real health-provider integration and production-grade security, authentication, and consent management would require further development.

## Future Scope

Potential future development includes:

- Authorized health-data import from supported health-data providers.
- A validated ingestion pipeline with timestamps, provenance, and deduplication.
- Secure authentication and production-grade database storage.
- Evaluation with appropriately sourced, consented datasets.
- Model calibration, explainability, and uncertainty reporting.
- Usability and clinical evaluation before any clinical application.
- Native Android integration where required for health-data access.

These items are future possibilities, not claims of completed functionality.

## Open-Source License

LifePrint 2.0 is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 CodeDense

The MIT License permits use, modification, distribution, sublicensing, and sale of the software, subject to its terms, including preservation of the copyright and license notices.

Third-party dependencies, datasets, and assets remain subject to their own licenses and terms.

## Project Links

| Resource | Link |
|---|---|
| GitHub Repository | [LifePrint 2.0](https://github.com/Anon-codee/LifePrint-2.0) |
| Frontend Demo | [Open LifePrint](https://lifeprint1.onrender.com/) |
| Backend API | [Open Backend](https://lifeprint1.onrender.com) |
| Architecture Diagram | [View Architecture](https://drive.google.com/file/d/1yhT5a9c93pQe21h9ep-xG_rGM41Au8_I/view?usp=sharing) |
| Project Presentation | [View Presentation](https://docs.google.com/presentation/d/13bgLzF6DdfERaVwN8Yw9j9-MP5S1ixoE/edit?usp=sharing&ouid=114865145327612651503&rtpof=true&sd=true) |
| Demonstration Video | [Video link](https://drive.google.com/file/d/1kQtuHBW9kCBv-0wB--bkDs4Sdxd3Q7nC/view?usp=sharing)) |
| License | [MIT License](LICENSE) |

## Disclaimer

LifePrint 2.0 is an educational and research prototype for demonstrating personalized health-data analysis and digital twin concepts. It is not intended to diagnose, treat, cure, or prevent any disease. Its outputs must not be used to make medical decisions. Clinical use would require appropriate validation, security safeguards, privacy protections, and applicable regulatory review.
