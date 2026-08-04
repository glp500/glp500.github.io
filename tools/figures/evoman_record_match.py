"""Record the evolved PSO controller actually playing EvoMan.

Loads the best weight vector the niching run produced and captures every
display flip, so the frames are a real match rather than a re-enactment.
"""
import os, sys
os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

import numpy as np, pygame
sys.path.insert(0, os.getcwd())

from evoman.environment import Environment
from demo_controller import player_controller

WEIGHTS, ENEMY, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
os.makedirs(OUT, exist_ok=True)

frames = {"n": 0, "saved": 0}
_flip = pygame.display.flip

def capture():
    _flip()
    frames["n"] += 1
    if frames["n"] % 2 == 0:                 # ~2x real time is plenty
        surf = pygame.display.get_surface()
        if surf is not None:
            pygame.image.save(surf, f"{OUT}/f{frames['saved']:04d}.png")
            frames["saved"] += 1

pygame.display.flip = capture

env = Environment(experiment_name=OUT,
                  playermode="ai",
                  player_controller=player_controller(10),
                  speed="fastest",
                  enemymode="static",
                  level=2,
                  visuals=True)
env.update_parameter("enemies", [ENEMY])

w = np.load(WEIGHTS)
f, p, e, t = env.play(pcont=w)
print(f"enemy {ENEMY}: fitness {f:.2f}  player life {p:.0f}  enemy life {e:.0f}  time {t}")
print("frames saved:", frames["saved"])
