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
image: /assets/images/projects/pso-evoman-match.webp
image_alt: "The evolved controller playing a round of EvoMan against enemy three"
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
  - type: image
    src: /assets/images/projects/pso-evoman-match.webp
    alt: "Animated recording of the evolved agent fighting and defeating EvoMan enemy three"
    caption: "The best weight vector from the niching run, replayed against enemy 3. It wins with 16 health left: fitness 85.45, enemy life 0, 471 ticks. This is the saved controller actually playing, captured frame by frame from the framework, not a re-enactment."
    source_label: "Recorded from the saved best_weights_enemy_3.npy"
  - type: chart
    src: /assets/images/projects/pso-diversity_plot.webp
    alt: "Swarm diversity falling over five hundred generations, with the niching variant staying higher"
    caption: "Swarm diversity over 500 generations. Both variants collapse toward each other, but niching holds a wider spread throughout, which is the entire reason to pay for it. Whether that spread buys anything is the next chart's problem."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/pso-fitness_plot.webp
    alt: "Best and mean fitness for standard and niching PSO, both plateauing within about a hundred generations"
    caption: "Fitness for the same runs. Both variants are effectively done inside 100 of the 500 generations, and niching's extra diversity does not convert into a better score here. Worth reporting precisely because it is the negative result."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/pso-boxplot_all_enemies.webp
    alt: "Boxplots of individual gain for standard and niching PSO across three enemies"
    caption: "Individual gain across three enemies, ten runs each. Enemy 3 is the only one where either variant reliably survives; against 4 and 6 most runs bottom out. A specialist controller per enemy is doing exactly what its name says."
    source_label: "Repository output"
---
A group project from my MSc, using the Evoman framework as a testbed for optimization algorithms. Each candidate neural controller is a particle, and its updates mix what that particle has found with what the population has.

## Question

How do baseline and adaptive particle-swarm strategies behave when optimizing specialist and generalist neural game agents?

## Approach

The repository holds several PSO variants, the experimental scripts, competition-result processing and an Evoman environment. It was shared work, so I have not tried to separate out who contributed what.

## Demonstration

The video shows a trained agent playing. It is evidence that the controller pipeline works end to end, and nothing more than that; it settles no comparison between the variants.
