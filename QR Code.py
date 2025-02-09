import qrcode
from PIL import Image, ImageDraw, ImageFont
import os


def create_qr_code():
    try:
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )

        # Add website URL to QR code
        website_url = "https://shakyarbin.github.io/EduCare/"
        qr.add_data(website_url)
        qr.make(fit=True)

        # Create QR code image
        qr_image = qr.make_image(fill_color="black", back_color="white")

        # Convert to RGB mode if necessary
        if qr_image.mode != 'RGB':
            qr_image = qr_image.convert('RGB')

        # Get QR code size
        qr_width, qr_height = qr_image.size

        # Create new image with space for text
        final_height = qr_height + 60
        final_image = Image.new('RGB', (qr_width, final_height), 'white')

        # Paste QR code
        final_image.paste(qr_image, (0, 0))

        # Add text
        draw = ImageDraw.Draw(final_image)
        font = ImageFont.load_default()
        text = "Scan for Emergency Information"

        # Get text size
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        text_width = right - left
        text_height = bottom - top

        # Calculate text position
        text_x = (qr_width - text_width) // 2
        text_y = qr_height + (60 - text_height) // 2

        # Draw text
        draw.text((text_x, text_y), text, font=font, fill='black')

        # Set path to F drive
        f_drive_path = "F:\\"

        # Check if F drive exists
        if not os.path.exists(f_drive_path):
            raise Exception("F drive not found. Please make sure F drive is connected.")

        # Create full file path
        qr_file_path = os.path.join(f_drive_path, 'emergency_qr.png')

        # Save image to F drive
        final_image.save(qr_file_path)
        print(f"QR code generated successfully and saved to: {qr_file_path}")

    except Exception as e:
        print(f"Error in create_qr_code: {str(e)}")
        raise


def main():
    try:
        create_qr_code()
    except Exception as e:
        print(f"Error generating QR code: {str(e)}")


if __name__ == "__main__":
    main()