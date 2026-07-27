---
title: "Pumped-Hydroelectric Energy Arbitrage with DDQN"
summary: "A collaborative reinforcement-learning environment in which an agent schedules reservoir pumping and generation against changing electricity prices."
date: 2026-01-28
status: "Completed course prototype"
role: "Collaborative MSc reinforcement-learning coursework"
context: "Graduate coursework"
dates_display: "January 2026"
featured: true
featured_rank: 8
stack:
  - Double DQN
  - Gymnasium
  - PyTorch
  - Time-series features
  - Hydroelectric modelling
topics:
  - Reinforcement learning
  - Energy systems
  - Sequential decisions
outcomes:
  - Models reservoir volume, hourly price, and calendar state
  - Uses a rule-informed policy to warm the DDQN replay buffer
  - Includes separate training and validation evaluation
image: /assets/images/projects/hydro-arbitrage.svg
image_alt: "Pumped-hydroelectric reservoir moving water between pumping and generation in response to electricity prices"
demo_url: ""
repo_url: "https://github.com/glp500/Dam-Energy-Stock-Trading-with-Q-Learning"
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/hydro-arbitrage.svg
    alt: "Electricity market price signals guiding reservoir pumping, holding, and generation decisions"
    caption: "System diagram derived from the environment code: pumping consumes purchased electricity; releasing water generates electricity for sale."
    source_url: "https://github.com/glp500/Dam-Energy-Stock-Trading-with-Q-Learning/blob/main/TestEnv.py"
    source_label: "Environment code"
  - type: chart
    src: /assets/images/projects/hydro-ddqn-training-result.webp
    alt: "Original repository chart of DDQN training and validation reward over one hundred episodes"
    caption: "Original repository result snapshot. It is retained rather than redrawn because the plotted episode series is not committed separately."
    source_url: "https://github.com/glp500/Dam-Energy-Stock-Trading-with-Q-Learning/blob/main/Code/DQN%20Agent%20(Updated)/training_result.png"
    source_label: "Original result"
---
The environment represents a pumped-hydroelectric reservoir operating against hourly electricity prices. The state includes reservoir volume, price, hour, day, month, and year.

## Question

Can a reinforcement-learning agent learn when to purchase electricity to pump water, hold stored potential energy, or release water to generate and sell electricity?

## Approach

Positive actions pump water and incur an electricity cost; negative actions release water through the generator and earn revenue. The updated code trains a Double DQN with replay memory, a target network, validation runs, and warm-up experience from a rule-informed baseline.

## Results

The repository includes a training-versus-validation reward image from a 100-episode run. The chart is shown as an experimental snapshot, not evidence of deployment performance or economic profitability outside the supplied simulation.
