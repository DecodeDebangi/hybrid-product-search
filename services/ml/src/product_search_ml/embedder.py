"""CLIP wrapper that maps text and images into the same 512-d space."""

import open_clip
import torch
from PIL import Image

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"
DIM = 512


def pick_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


class ClipEmbedder:
    def __init__(self, device: str | None = None):
        self.device = device or pick_device()
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME, pretrained=PRETRAINED, device=self.device
        )
        self.model.eval()
        self.tokenizer = open_clip.get_tokenizer(MODEL_NAME)

    @torch.inference_mode()
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        tokens = self.tokenizer(texts).to(self.device)
        return self._normalize(self.model.encode_text(tokens))

    @torch.inference_mode()
    def embed_images(self, images: list[Image.Image]) -> list[list[float]]:
        batch = torch.stack([self.preprocess(img.convert("RGB")) for img in images])
        return self._normalize(self.model.encode_image(batch.to(self.device)))

    @staticmethod
    def _normalize(feats: torch.Tensor) -> list[list[float]]:
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.float().cpu().tolist()
