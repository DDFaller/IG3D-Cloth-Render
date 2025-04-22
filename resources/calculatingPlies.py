import math
import numpy as np

number_of_plies = 3
core_ply = np.array([0, 0, 0])  # centro
radius = 5

plies = [2 * math.pi * plie / number_of_plies for plie in range(number_of_plies)]
angles = [round(math.degrees(angle), 2) for angle in plies]
print(f'Angles around center ply: {angles}°')

normal = np.array([0, 1, 0])    # eixo Y
binormal = np.array([1, 0, 0])  # eixo X

offsets = [radius * math.cos(angle) * normal + radius * math.sin(angle) * binormal for angle in plies]

positions = [core_ply + offset for offset in offsets]

print("Offset positions:")
for pos in positions:
    print(pos)
