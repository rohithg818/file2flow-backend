"""
File2Flow — FastAPI Conversion Server
Exposes the Python conversion engine via HTTP API.
"""

import os
import sys
import uuid
import tempfile
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from converter import convert_to_pdf, ConversionOptions

app = FastAPI(
    title="File2Flow Conversion Engine",
    description="Professional document-to-PDF conversion API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "file2flow_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SUPPORTED_FORMATS = {
    ".docx", ".doc",
    ".xlsx", ".xls", ".csv",
    ".pptx", ".ppt",
    ".json",
    ".md", ".markdown",
    ".html", ".htm",
    ".txt", ".rtf",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
    ".svg",
}


@app.get("/api/engine/health")
async def health():
    return {
        "status": "ok",
        "engine": "python",
        "version": "1.0.0",
        "supported_formats": sorted(SUPPORTED_FORMATS),
    }


@app.post("/api/engine/convert")
async def convert_file(
    file: UploadFile = File(...),
    page_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    margin: str = Form("normal"),
    watermark: str = Form(""),
    add_page_numbers: bool = Form(True),
    quality: str = Form("high"),
    image_fit: str = Form("contain"),
):
    # Validate file
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    tmp_path = UPLOAD_DIR / f"{file_id}{ext}"

    try:
        content = await file.read()
        print(f"[ENGINE] Received file: {file.filename} ({len(content)} bytes)")
        with open(tmp_path, "wb") as f:
            f.write(content)
        print(f"[ENGINE] Saved to: {tmp_path}")

        options = ConversionOptions(
            page_size=page_size,
            orientation=orientation,
            margin=margin,
            watermark=watermark or "",
            add_page_numbers=add_page_numbers,
            quality=quality,
            image_fit=image_fit,
        )

        pdf_bytes = convert_to_pdf(str(tmp_path), options)

        # Generate output filename
        base_name = Path(file.filename or "output").stem
        output_name = f"{base_name}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_name}"',
                "X-Page-Size": page_size,
                "X-Orientation": orientation,
            },
        )

    except ValueError as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


@app.post("/api/engine/convert/batch")
async def convert_batch(
    files: list[UploadFile] = File(...),
    page_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    margin: str = Form("normal"),
    watermark: str = Form(""),
    add_page_numbers: bool = Form(True),
):
    results = []
    options = ConversionOptions(
        page_size=page_size,
        orientation=orientation,
        margin=margin,
        watermark=watermark or "",
        add_page_numbers=add_page_numbers,
    )

    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in SUPPORTED_FORMATS:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": f"Unsupported format: {ext}",
            })
            continue

        file_id = str(uuid.uuid4())
        tmp_path = UPLOAD_DIR / f"{file_id}{ext}"

        try:
            with open(tmp_path, "wb") as f:
                content = await file.read()
                f.write(content)

            pdf_bytes = convert_to_pdf(str(tmp_path), options)
            base_name = Path(file.filename).stem

            results.append({
                "filename": f"{base_name}.pdf",
                "success": True,
                "size": len(pdf_bytes),
            })

        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
            })
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ENGINE_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
