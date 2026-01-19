from PIL import Image, ImageDraw, ImageFont
import textwrap
from pathlib import Path
from typing import Optional

def generate_health_card(
    risk_level: str,
    details: str,
    language: str = "en",
    output_path: Path = Path("health_card.jpg"),
    optimize_for_2g: bool = True
) -> Path:
    """
    Generates a simple, clean health report card optimized for WhatsApp.
    Just a colored circle (green/orange/red) with minimal text.

    OPTIMIZATION FOR RURAL AREAS:
    - Small size: 600x600 square (perfect for WhatsApp)
    - JPEG format with 70% quality
    - Target: <30KB (loads quickly even on 2G)
    - Clean, simple design - just colored circle

    Args:
        risk_level: 'low', 'normal', 'moderate', 'high', etc.
        details: Health recommendation text (not used in simple design)
        language: Language code (en, hi, ta, etc.)
        output_path: Where to save the image
        optimize_for_2g: Use low-bandwidth optimizations

    Returns:
        Path to generated image file
    """

    # Color Scheme - Simple traffic light system
    colors = {
        "low": "#4CAF50",        # Green - All Good
        "mild": "#4CAF50",       # Green - All Good
        "normal": "#4CAF50",     # Green - All Good
        "medium": "#FF9800",     # Orange - Moderate
        "moderate": "#FF9800",   # Orange - Moderate
        "high": "#F44336",       # Red - TB/High Risk
        "severe": "#F44336",     # Red - TB/High Risk
        "urgent": "#D32F2F",     # Dark Red - Emergency
        "high_risk": "#F44336",  # Red - TB detected
        "moderate_risk": "#FF9800", # Orange - Moderate
        "low_risk": "#4CAF50"    # Green
    }

    circle_color = colors.get(risk_level.lower(), "#9E9E9E")

    # Canvas - Square for WhatsApp
    size = 600
    img = Image.new('RGB', (size, size), color='white')
    draw = ImageDraw.Draw(img)

    # Draw large filled circle in center
    circle_radius = 220
    center_x = size // 2
    center_y = size // 2
    
    # Draw filled circle
    draw.ellipse(
        [(center_x - circle_radius, center_y - circle_radius),
         (center_x + circle_radius, center_y + circle_radius)],
        fill=circle_color
    )

    # Text Setup
    try:
        font_large = ImageFont.truetype("arial.ttf", 80)
        font_medium = ImageFont.truetype("arial.ttf", 40)
        font_small = ImageFont.truetype("arial.ttf", 28)
    except IOError:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Status Text in Circle
    status_text = {
        "low": "✓",
        "mild": "✓",
        "normal": "✓",
        "moderate": "!",
        "medium": "!",
        "high": "!!",
        "severe": "!!",
        "urgent": "!!!",
        "high_risk": "!!",
        "moderate_risk": "!",
        "low_risk": "✓"
    }
    
    emoji = status_text.get(risk_level.lower(), "?")
    
    # Draw emoji in center of circle
    bbox = draw.textbbox((0, 0), emoji, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    draw.text(
        (center_x - text_width // 2, center_y - text_height // 2 - 20),
        emoji,
        fill="white",
        font=font_large
    )

    # Risk level text below emoji
    risk_display = risk_level.upper()
    bbox2 = draw.textbbox((0, 0), risk_display, font=font_medium)
    text2_width = bbox2[2] - bbox2[0]
    
    draw.text(
        (center_x - text2_width // 2, center_y + 40),
        risk_display,
        fill="white",
        font=font_medium
    )

    # Medical Contact Number at bottom
    contact_y = size - 120
    contact_text = "Emergency: 108"
    
    if risk_level.lower() in ["high", "severe", "urgent", "high_risk"]:
        contact_text = "Emergency: 108 | TB Helpline: 1800-11-6666"
    
    # Draw contact number
    bbox3 = draw.textbbox((0, 0), contact_text, font=font_small)
    text3_width = bbox3[2] - bbox3[0]
    
    draw.text(
        (center_x - text3_width // 2, contact_y),
        contact_text,
        fill="#333333",
        font=font_small
    )

    # Footer
    footer_text = "AI Health Screening"
    bbox4 = draw.textbbox((0, 0), footer_text, font=font_small)
    text4_width = bbox4[2] - bbox4[0]
    
    draw.text(
        (center_x - text4_width // 2, size - 50),
        footer_text,
        fill="#999999",
        font=font_small
    )

    # Save optimized for WhatsApp
    img.save(output_path, format='JPEG', quality=70, optimize=True)

    return output_path
