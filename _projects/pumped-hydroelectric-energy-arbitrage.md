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
image: /assets/images/projects/hydro-cumulative-profit.webp
image_alt: "Cumulative profit curve over the validation set, ending near sixty-seven thousand euros"
demo_url: ""
repo_url: "https://github.com/glp500/Dam-Energy-Stock-Trading-with-Q-Learning"
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: chart
    src: /assets/images/projects/hydro-cumulative-profit.webp
    alt: "Cumulative profit rising steadily across roughly 17,500 simulated hours to about EUR 66,900"
    caption: "Cumulative profit over the validation set: EUR 66,900 across roughly 17,500 simulated hours. The curve is close to monotonic, which matters more than the final figure. A strategy that made the same money in three lucky weeks would be worthless."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/hydro-value-surface.webp
    alt: "Three-dimensional surface of estimated action value against reservoir volume and electricity price"
    caption: "The learned value surface at mid-year noon, over reservoir volume and price. The agent has worked out that a full reservoir at a high price is the only state really worth holding."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/hydro-training-curve.webp
    alt: "Double DQN training reward climbing across twenty episodes with validation scores marked"
    caption: "Training reward across twenty episodes, with validation scores marked separately. Twenty episodes is few, and the curve is still climbing at the end; the honest reading is that this was stopped when it was good enough for the assignment, not when it converged."
    source_label: "Repository output"
---
The environment is a pumped-hydroelectric reservoir trading against hourly electricity prices. Its state is the reservoir volume, the current price, and the hour, day, month and year.

## Question

Can a reinforcement-learning agent learn when to purchase electricity to pump water, hold stored potential energy, or release water to generate and sell electricity?

## Approach

A positive action pumps water uphill and costs electricity; a negative one releases it through the generator and earns revenue. I train a Double DQN with replay memory and a target network, run validation episodes alongside, and warm the buffer up with experience from a rule-informed baseline so early training is not pure flailing.

## Results

The repository has a training-versus-validation reward chart from a 100-episode run. Take it as a snapshot of an experiment. It says nothing about how this would behave outside the supplied simulation, and nothing at all about whether it would make money.
