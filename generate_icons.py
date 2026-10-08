import os
from PIL import Image, ImageDraw

def create_icon(size):
    # Create RGBA image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    padding = size * 0.08
    # Background rounded box
    box = [padding, padding, size - padding, size - padding]
    corner_radius = size * 0.22
    
    # Red gradient-like solid YouTube Red (#FF0033)
    draw.rounded_rectangle(box, radius=corner_radius, fill=(255, 0, 51, 255))
    
    # Draw Mouse silhouette + Skip arrows in white
    # Fast forward double triangle (skip icon)
    center_x, center_y = size / 2, size / 2
    s = size * 0.28
    
    # Left triangle
    p1 = (center_x - s * 0.8, center_y - s)
    p2 = (center_x - s * 0.8, center_y + s)
    p3 = (center_x + s * 0.1, center_y)
    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))
    
    # Right triangle
    p4 = (center_x + s * 0.1, center_y - s)
    p5 = (center_x + s * 0.1, center_y + s)
    p6 = (center_x + s * 1.0, center_y)
    draw.polygon([p4, p5, p6], fill=(255, 255, 255, 255))
    
    return img

os.makedirs('mouse_gestures/icons', exist_ok=True)
for s in [16, 48, 128]:
    icon = create_icon(s)
    icon.save(f'mouse_gestures/icons/icon{s}.png')

print("Icons generated successfully!")
