"""HTTP service the API calls to embed search queries at request time."""

import io
import os
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from .embedder import DIM, MODEL_NAME, PRETRAINED, ClipEmbedder

# CLIP was trained on captions, so short queries match better inside a caption-like prompt.
QUERY_TEMPLATE = "a photo of {}"

state: dict[str, ClipEmbedder] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    clip = ClipEmbedder()
    # The first forward pass compiles GPU kernels; pay that cost before taking traffic.
    clip.embed_texts(["warmup"])
    clip.embed_images([Image.new("RGB", (224, 224))])
    state["clip"] = clip
    yield
    state.clear()


app = FastAPI(title="findwise-embedder", lifespan=lifespan)


class TextRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)
    template: bool = True


@app.get("/health")
def health():
    clip = state.get("clip")
    return {
        "ok": clip is not None,
        "model": f"{MODEL_NAME}/{PRETRAINED}",
        "dim": DIM,
        "device": clip.device if clip else None,
    }


@app.post("/embed/text")
def embed_text(req: TextRequest):
    texts = [QUERY_TEMPLATE.format(t) for t in req.texts] if req.template else req.texts
    start = time.perf_counter()
    vectors = state["clip"].embed_texts(texts)
    return {"vectors": vectors, "ms": round((time.perf_counter() - start) * 1000, 2)}


@app.post("/embed/image")
async def embed_image(file: UploadFile = File(...)):
    try:
        image = Image.open(io.BytesIO(await file.read()))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Unsupported image file")
    start = time.perf_counter()
    [vector] = state["clip"].embed_images([image])
    return {"vector": vector, "ms": round((time.perf_counter() - start) * 1000, 2)}


def main():
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("EMBEDDER_PORT", "8001")))
