from pathlib import Path
from sys import argv

from PIL import Image


def prepare_frame(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    crop_height = min(image.height, 1050)
    image = image.crop((0, 0, image.width, crop_height))
    target_width = 960
    target_height = round(image.height * target_width / image.width)
    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
    return image.quantize(colors=160, method=Image.Quantize.MEDIANCUT)


def main() -> None:
    frame_directory = Path(argv[1])
    output_path = Path(argv[2])
    frames = [prepare_frame(frame_directory / f"{index}.png") for index in range(1, 5)]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=[1700, 1700, 1900, 1900],
        loop=0,
        optimize=True,
        disposal=2,
    )


if __name__ == "__main__":
    main()
