"""
Laya Healthcare — Claims Router
GET /api/claims/{member_id} — Get claims history
POST /api/upload — Upload document for OCR processing
"""

from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.models.database import get_claims_history
from app.tools.ocr_tools import mock_ocr_extract, real_ocr_extract
from app.config import settings

router = APIRouter()


@router.get("/claims/{member_id}")
async def get_member_claims(member_id: str):
    """Return claims history for a specific member."""
    history = get_claims_history(member_id)
    return {"member_id": member_id, "claims": history, "total": len(history)}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a claim document for OCR processing.

    In mock mode (default), returns a template for the user to fill.
    In real mode (USE_REAL_OCR=true), processes the image via GPT-4V.
    """
    try:
        contents = await file.read()

        if settings.USE_REAL_OCR:
            # Real OCR via GPT-4V
            image_b64 = base64.b64encode(contents).decode("utf-8")
            result = real_ocr_extract.invoke({"image_base64": image_b64})
        else:
            # Mock mode — return a template
            result = {
                "success": True,
                "extraction_method": "mock_template",
                "message": (
                    "Document received. In demo mode, please provide the extracted "
                    "document data as JSON in your chat message."
                ),
                "template": {
                    "member_id": "",
                    "patient_name": "",
                    "form_type": "Money Smart Out-patient Claim Form",
                    "treatment_type": "",
                    "treatment_date": "",
                    "practitioner_name": "",
                    "total_cost": 0.0,
                    "signature_present": True,
                },
            }

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing upload: {str(e)}",
        )
