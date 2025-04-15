import pygame
import random

# Konstanta ukuran layar
WIDTH, HEIGHT = 1200, 800

# Warna jalan abu-abu
ROAD_COLOR_RANGE = [(90, 90, 90), (150, 150, 150)]

# Inisialisasi pygame
pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Simulasi Kurir")

# Load peta dari gambar
def load_map(image_path):
    return pygame.image.load(image_path)

# Cek apakah posisi valid (di atas jalan)
def is_valid_position(map_surface, x, y):
    color = map_surface.get_at((x, y))[:3]
    return ROAD_COLOR_RANGE[0] <= color <= ROAD_COLOR_RANGE[1]

# Ambil posisi acak di jalan
def get_random_valid_position(map_surface):
    while True:
        x, y = random.randint(0, WIDTH-1), random.randint(0, HEIGHT-1)
        if is_valid_position(map_surface, x, y):
            return x, y

map_image = load_map("map.png")
courier_pos = get_random_valid_position(map_image)
source_pos = get_random_valid_position(map_image)
destination_pos = get_random_valid_position(map_image)

running = True
while running:
    screen.fill((255, 255, 255))
    screen.blit(map_image, (0, 0))

    pygame.draw.circle(screen, (255, 255, 0), source_pos, 10)
    pygame.draw.circle(screen, (255, 0, 0), destination_pos, 10)
    pygame.draw.polygon(screen, (0, 0, 255), [(courier_pos[0], courier_pos[1]-10),
                                              (courier_pos[0]-10, courier_pos[1]+10),
                                              (courier_pos[0]+10, courier_pos[1]+10)])

    pygame.display.flip()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

pygame.quit()