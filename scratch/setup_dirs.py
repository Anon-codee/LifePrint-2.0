import os

dirs = [
    "frontend/src/api",
    "frontend/src/hooks",
    "frontend/src/components",
    "frontend/src/components/layout",
    "frontend/src/components/ui",
    "frontend/src/components/charts",
    "frontend/src/pages",
    "frontend/src/lib",
    "frontend/src/context"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

print("Directories created successfully.")
