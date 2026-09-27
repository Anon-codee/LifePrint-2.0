import os
import re

def patch_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)

base = "c:/Users/ASUS/Documents/Programming/Projects/LifePrint/LifePrint/frontend/src"

# Remove React
for root, _, files in os.walk(base):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            content = re.sub(r"import React(?:, \{[^}]+\})? from 'react';\n", lambda m: m.group(0).replace('React, ', '').replace('React', '') if '{' in m.group(0) else '', content)
            with open(path, 'w') as f:
                f.write(content)

# Specific fixes
patch_file(f"{base}/pages/Dashboard.tsx", [
    ("XAxis, YAxis, ", "")
])

patch_file(f"{base}/pages/GraphPage.tsx", [
    ("import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Position, MarkerType } from '@xyflow/react';", "import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';\nimport type { Node, Edge } from '@xyflow/react';"),
    ("useNodesState([])", "useNodesState<Node>([])"),
    ("useEdgesState([])", "useEdgesState<Edge>([])"),
    ("(event: any, edge: Edge)", "(_event: any, edge: Edge)")
])

patch_file(f"{base}/pages/WhatIf.tsx", [
    ("useMemo", ""),
    ("ArrowRight, Activity, AlertCircle", "ArrowRight, Activity"),
    ("setValues(prev =>", "setValues((prev: any) =>")
])

print("Fixes applied.")
