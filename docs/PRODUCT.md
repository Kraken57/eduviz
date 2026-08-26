# Product Specification

## Problem Statement

Educational content — math problems, scientific concepts, historical timelines, diagrams, simulations — is difficult to convey through static text or pre-rendered videos. Students benefit from interactive, procedural visualizations that adapt to their inputs and let them explore concepts directly.

Existing solutions either require a human to manually create every visualization, or produce generic animations that cannot respond to specific educational scenarios.

## Goal

Build a system that automatically converts educational intent into interactive visual experiences, using local AI as a reasoning layer and specialized renderers as the output layer.

## Core Capabilities (Long-term)

1. **Natural language input**: Students describe what they want to understand or solve.
2. **AI reasoning**: A local LLM (Google Gemma 4 E4B via Ollama) interprets the input and produces a structured visualization specification.
3. **Visualization DSL**: A renderer-independent representation of the visualization intent.
4. **Multiple renderers**: 2D (Canvas/SVG), 3D (Three.js/WebGL), mathematical notation, physics simulation, cinematic animation (Manim), and others.
5. **Interactivity**: Users can manipulate parameters, step through processes, and explore variations.
6. **Procedural generation**: Visualizations are generated algorithmically, not from pre-built libraries.

## Non-Goals (for now)

- Cloud-hosted or multi-user features
- Authentication, user accounts, or data persistence beyond session state
- Mobile-native applications
- Content authoring tools for teachers (future consideration)
- Integration with LMS platforms

## Target Users

- Students seeking to understand concepts through visual exploration
- Educators using the system as a teaching aid
- Self-learners working through problems interactively

## Success Criteria

- A student can type a question and receive a relevant, interactive visualization
- The system runs entirely locally (no cloud dependencies for core functionality)
- New visualization domains can be added without modifying the core engine
- The AI layer and rendering layer are fully decoupled
