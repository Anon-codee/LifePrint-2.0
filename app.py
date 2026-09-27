import streamlit as st
import pandas as pd
import networkx as nx

from data.loader import load_health_data
from services.analytics import (
    calculate_baseline,
    compare_to_baseline,
    headache_sleep_pattern,
    discover_headache_relationships
)
from services.prediction import train_model, predict_headache, explain_prediction
from services.graph import build_health_graph
from services.what_if import simulate_what_if


from services.user import get_user_health_summary, get_user_data

# ============================================================
# CONFIG
# ============================================================
health_features = [
    "sleep_hours",
    "hydration_liters",
    "stress",
    "activity_steps",
    "caffeine"
]

labels = {
    "sleep_hours": "Sleep",
    "hydration_liters": "Hydration",
    "stress": "Stress",
    "activity_steps": "Activity",
    "caffeine": "Caffeine"
}

units = {
    "sleep_hours": "hrs",
    "hydration_liters": "L",
    "stress": "/10",
    "activity_steps": "steps",
    "caffeine": ""
}

# ============================================================
# PAGE CONFIG
# ============================================================
st.set_page_config(
    page_title="LifePrint",
    page_icon="🧬",
    layout="wide"
)

# ============================================================
# DATA & SERVICES INIT
# ============================================================
@st.cache_data
def load_data():
    return load_health_data("data/health_data.csv")

df = load_data()

@st.cache_resource
def get_model(data):
    return train_model(data)

model = get_model(df)

# ============================================================
# SIDEBAR & USER SELECTION
# ============================================================
st.sidebar.title("🧬 LifePrint")
st.sidebar.markdown(
    """
    ### Your Health. Your Story.

    LifePrint learns recurring patterns
    from your longitudinal health history.
    """
)

user_ids = df["user_id"].unique().tolist()
selected_user_id = st.sidebar.selectbox("Select User Profile", user_ids)

# Generate personalized summary
user_summary = get_user_health_summary(df, selected_user_id)
user_df = get_user_data(df, selected_user_id)

today = user_summary["today"]
personal_baseline = user_summary["personal_baseline"]
comparison = user_summary["deviations"]
patterns = user_summary["patterns"]

risk = predict_headache(model, today)
explanations = explain_prediction(model, today)
pattern = headache_sleep_pattern(user_df)

section = st.sidebar.radio(
    "Navigate",
    [
        "Dashboard",
        "Health Timeline",
        "Personal Health Graph",
        "What-If Simulator"
    ]
)

# ============================================================
# HEADER
# ============================================================
st.title("LIFEPRINT")
st.subheader("A Personalized Health Digital Twin")
st.caption("From tracking health parameters → to learning the individual.")
st.divider()

# ============================================================
# DASHBOARD
# ============================================================
if section == "Dashboard":

    st.header("Today's Health")
    cols = st.columns(5)

    for col, feature in zip(cols, health_features):
        current_val = today[feature]
        deviation = comparison[feature]["percent_difference"]
        
        col.metric(
            labels[feature],
            f"{current_val:.1f} {units[feature]}",
            f"{deviation:+.1f}% vs baseline"
        )

    st.divider()

    st.header("🔮 Headache Likelihood")
    prediction_col, explanation_col = st.columns([1, 2])

    with prediction_col:
        st.metric("Estimated likelihood", f"{risk * 100:.1f}%")
        if risk >= 0.7:
            st.warning("Higher model-estimated likelihood")
        elif risk >= 0.4:
            st.info("Moderate model-estimated likelihood")
        else:
            st.success("Lower model-estimated likelihood")

    with explanation_col:
        st.subheader("Why this prediction?")
        for item in explanations[:3]:
            feature_name = item["feature"].replace("_", " ").title()
            st.write(
                f"**{feature_name}** — "
                f"model importance: {item['importance']:.3f}"
            )

    st.divider()

    st.header("🧠 What LifePrint Learned")
    st.info(
        f"{pattern['percentage']:.1f}% of your "
        f"recorded headaches occurred after "
        f"below-average sleep."
    )
    st.caption(
        f"Based on {pattern['total_headaches']} recorded "
        f"headache events in the dataset."
    )

    st.divider()

    st.header("Your Personal Baseline")
    baseline_cols = st.columns(5)

    for col, feature in zip(baseline_cols, health_features):
        col.metric(
            labels[feature],
            f"{personal_baseline[feature]:.2f}"
        )


# ============================================================
# TIMELINE
# ============================================================
elif section == "Health Timeline":

    st.header("📈 Your Health Timeline")
    st.write(
        "LifePrint uses longitudinal data to understand "
        "how your health changes over time."
    )

    chart_data = user_df.copy()
    chart_data["date"] = pd.to_datetime(chart_data["date"])
    chart_data = chart_data.set_index("date")

    st.subheader("Sleep")
    st.line_chart(chart_data["sleep_hours"])

    st.subheader("Hydration")
    st.line_chart(chart_data["hydration_liters"])

    st.subheader("Stress")
    st.line_chart(chart_data["stress"])

    st.subheader("Activity")
    st.line_chart(chart_data["activity_steps"])

    st.subheader("Caffeine")
    st.line_chart(chart_data["caffeine"])

    st.subheader("Headache Events")
    st.bar_chart(chart_data["headache"])


# ============================================================
# HEALTH GRAPH
# ============================================================
elif section == "Personal Health Graph":

    st.header("🧠 Personal Health Graph")
    st.write(
        "Relationships discovered from your "
        "longitudinal health history."
    )

    graph = build_health_graph(user_df)

    st.subheader("Learned Relationships")
    for source, target, data in graph.edges(data=True):
        symbol = "+" if data["direction"] == "positive" else "−"
        st.write(
            f"**{source} → {target}**  "
            f"{symbol} strength: {data['strength']:.3f}"
        )

    st.divider()

    st.subheader("Graph Structure")
    graph_data = pd.DataFrame([
        {
            "Factor": source,
            "Relationship": f"{data['direction']} association",
            "Strength": data["strength"]
        }
        for source, target, data in graph.edges(data=True)
    ])

    st.dataframe(
        graph_data,
        use_container_width=True,
        hide_index=True
    )

    st.caption(
        "Relationships represent statistical associations "
        "in the prototype dataset, not medical causation."
    )


# ============================================================
# WHAT-IF SIMULATOR
# ============================================================
elif section == "What-If Simulator":

    st.header("🔮 What-If Health Simulator")
    st.write(
        "Change your hypothetical health conditions "
        "and see how the prediction model responds."
    )
    st.warning(
        "This is a model simulation, not a medical "
        "prediction or treatment recommendation."
    )

    col1, col2 = st.columns(2)

    with col1:
        sleep = st.slider("Sleep (hours)", min_value=3.0, max_value=10.0, value=float(today["sleep_hours"]), step=0.1)
        hydration = st.slider("Hydration (liters)", min_value=0.5, max_value=4.0, value=float(today["hydration_liters"]), step=0.1)
        stress = st.slider("Stress", min_value=0, max_value=10, value=int(today["stress"]))

    with col2:
        activity = st.slider("Activity (steps)", min_value=1000, max_value=15000, value=int(today["activity_steps"]), step=500)
        caffeine = st.slider("Caffeine", min_value=0, max_value=6, value=int(today["caffeine"]), step=1)

    result = simulate_what_if(
        model=model,
        current_health=today,
        sleep=sleep,
        hydration=hydration,
        stress=stress,
        activity=activity,
        caffeine=caffeine
    )

    st.divider()
    current_col, simulated_col = st.columns(2)

    with current_col:
        st.metric("Current estimate", f"{result['current_risk'] * 100:.1f}%")

    with simulated_col:
        st.metric(
            "Simulated estimate",
            f"{result['simulated_risk'] * 100:.1f}%",
            f"{result['difference'] * 100:+.1f} points"
        )

    st.divider()
    st.subheader("Simulation Summary")
    st.write(
        f"""
        With the selected hypothetical conditions:

        - Sleep: **{sleep:.1f} hours**
        - Hydration: **{hydration:.1f} L**
        - Stress: **{stress}/10**
        - Activity: **{activity:,} steps**
        - Caffeine: **{caffeine}**
        """
    )
    st.info(
        "LifePrint recalculates the model output using "
        "the hypothetical values. This demonstrates "
        "model sensitivity, not proof of causality."
    )

# ============================================================
# FOOTER
# ============================================================
st.divider()
st.caption(
    "LifePrint Prototype • Research demonstration • "
    "Not intended for medical diagnosis or treatment."
)