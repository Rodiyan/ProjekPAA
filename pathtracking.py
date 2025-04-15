import pygame
import random
import tkinter as tk
from tkinter import filedialog

WIDTH, HEIGHT = 1200, 800
ROAD_COLOR_RANGE = [(90, 90, 90), (150, 150, 150)]

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Simulasi Kurir")
font = pygame.font.SysFont(None, 36)

def choose_file():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg")])
    root.destroy()
    return file_path

def load_map(image_path):
    return pygame.image.load(image_path)

def is_valid_position(map_surface, x, y):
    color = map_surface.get_at((x, y))[:3]
    return ROAD_COLOR_RANGE[0] <= color <= ROAD_COLOR_RANGE[1]

def get_random_valid_position(map_surface):
    while True:
        x, y = random.randint(0, WIDTH-1), random.randint(0, HEIGHT-1)
        if is_valid_position(map_surface, x, y):
            return x, y

start_button = pygame.Rect(50, 30, 100, 40)
stop_button = pygame.Rect(170, 30, 100, 40)
upload_button = pygame.Rect(290, 30, 160, 40)
random_button = pygame.Rect(470, 30, 200, 40)

map_image = None
courier_pos = source_pos = destination_pos = (0, 0)
simulation_running = False

running = True
while running:
    screen.fill((255, 255, 255))

    if map_image:
        screen.blit(map_image, (0, 0))

        pygame.draw.circle(screen, (255, 255, 0), source_pos, 10)
        pygame.draw.circle(screen, (255, 0, 0), destination_pos, 10)
        pygame.draw.polygon(screen, (0, 0, 255), [(courier_pos[0], courier_pos[1]-10),
                                                  (courier_pos[0]-10, courier_pos[1]+10),
                                                  (courier_pos[0]+10, courier_pos[1]+10)])

    pygame.draw.rect(screen, (0, 200, 0), start_button)
    screen.blit(font.render("Start", True, (255, 255, 255)), (start_button.x + 20, start_button.y + 5))

    pygame.draw.rect(screen, (200, 0, 0), stop_button)
    screen.blit(font.render("Stop", True, (255, 255, 255)), (stop_button.x + 25, stop_button.y + 5))

    pygame.draw.rect(screen, (0, 0, 200), upload_button)
    screen.blit(font.render("Upload Peta", True, (255, 255, 255)), (upload_button.x + 10, upload_button.y + 5))

    pygame.draw.rect(screen, (255, 165, 0), random_button)
    screen.blit(font.render("Acak Kurir & Tujuan", True, (0, 0, 0)), (random_button.x + 5, random_button.y + 5))

    pygame.display.flip()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if start_button.collidepoint(event.pos):
                simulation_running = True
                print("Simulation started")
            elif stop_button.collidepoint(event.pos):
                simulation_running = False
                print("Simulation stopped")
            elif upload_button.collidepoint(event.pos):
                file_path = choose_file()
                if file_path:
                    try:
                        map_image = load_map(file_path)
                        courier_pos = get_random_valid_position(map_image)
                        source_pos = get_random_valid_position(map_image)
                        destination_pos = get_random_valid_position(map_image)
                        print(f"Peta dimuat dari {file_path}")
                    except Exception as e:
                        print(f"Gagal memuat peta: {e}")
            elif random_button.collidepoint(event.pos):
                if map_image:
                    courier_pos = get_random_valid_position(map_image)
                    source_pos = get_random_valid_position(map_image)
                    destination_pos = get_random_valid_position(map_image)
                    print("Kurir dan tujuan diacak")

pygame.quit()