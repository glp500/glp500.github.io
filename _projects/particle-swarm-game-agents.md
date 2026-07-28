---
title: "Particle Swarm Optimisation for Game Agents"
summary: "A collaborative reinforcement-learning project using particle swarm optimisation to train neural game-playing agents in the Evoman testbed."
date: 2024-10-20
status: "Completed course project"
role: "Collaborative MSc coursework"
context: "Graduate coursework"
dates_display: "October 2024"
featured: true
featured_rank: 7
stack:
  - Particle swarm optimisation
  - Neural controllers
  - Evoman
  - Python
topics:
  - Reinforcement learning
  - Evolutionary computation
  - Game agents
outcomes:
  - Implements baseline and adaptive PSO variants
  - Evaluates specialist and generalist game agents
  - Includes a recorded gameplay demonstration
image: /assets/images/projects/pso-game-agents.svg
image_alt: "Particles exploring a neural-controller search landscape above a stylized game arena"
demo_url: "https://www.youtube.com/watch?v=ZqaMjd1E4ZI"
repo_url: "https://github.com/glp500/Particle-Swarm-Optimisation-for-RL-Game-Environments"
paper_url: ""
fields:
  - machine-learning
  - collective-intelligence
related_publication: ""
video_embed: "https://www.youtube-nocookie.com/embed/ZqaMjd1E4ZI"
video_title: "Particle swarm trained Evoman agent gameplay"
video_caption: "Recorded gameplay from the public project repository."
visuals:
  - type: diagram
    src: /assets/images/projects/pso-game-agents.svg
    alt: "A particle population updating candidate neural controllers through individual and collective search"
    caption: "Explanatory diagram of the project's optimization loop. Gameplay is in the embedded demonstration."
    source_url: "https://github.com/glp500/Particle-Swarm-Optimisation-for-RL-Game-Environments"
    source_label: "Public repository"
---
A group project from my MSc, using the Evoman framework as a testbed for optimization algorithms. Each candidate neural controller is a particle, and its updates mix what that particle has found with what the population has.

## Question

How do baseline and adaptive particle-swarm strategies behave when optimizing specialist and generalist neural game agents?

## Approach

The repository holds several PSO variants, the experimental scripts, competition-result processing and an Evoman environment. It was shared work, so I have not tried to separate out who contributed what.

## Demonstration

The video shows a trained agent playing. It is evidence that the controller pipeline works end to end, and nothing more than that; it settles no comparison between the variants.
