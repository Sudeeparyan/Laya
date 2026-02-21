"""
Laya Healthcare AI Claims Chatbot — OCR Tools
Mock OCR (pass-through) and optional real GPT-4V OCR extraction.
"""

from __future__ import annotations

from langchain_core.tools import tool

from app.config import settings


@tool
def mock_ocr_extract(document_json: dict) -> dict:
    """Process a pre-built mock OCR JSON document and return structured
    extracted data. This is used during demos to simulate OCR extraction
    without requiring actual document images."""
    # In mock mode we simply pass through the JSON, validating required fields
    required_fields = ["member_id", "patient_name", "treatment_type", "treatment_date"]
    missing = [f for f in required_fields if f not in document_json]
    if missing:
        return {
            "success": False,
            "error": f"Missing required fields: {', '.join(missing)}",
            "extracted_data": document_json,
        }
    return {
        "success": True,
        "extraction_method": "mock_ocr",
        "extracted_data": {
            "member_id": document_json.get("member_id"),
            "patient_name": document_json.get("patient_name"),
            "form_type": document_json.get("form_type", "Money Smart Out-patient Claim Form"),
            "treatment_type": document_json.get("treatment_type"),
            "treatment_date": document_json.get("treatment_date"),
            "practitioner_name": document_json.get("practitioner_name", "Unknown"),
            "total_cost": document_json.get("total_cost", 0.0),
            "signature_present": document_json.get("signature_present", True),
            "procedure_code": document_json.get("procedure_code"),
            "clinical_indicator": document_json.get("clinical_indicator"),
            "hospital_days": document_json.get("hospital_days"),
            "is_accident": document_json.get("is_accident"),
            "solicitor_involved": document_json.get("solicitor_involved"),
            "histology_report_attached": document_json.get("histology_report_attached"),
            "serum_ferritin_provided": document_json.get("serum_ferritin_provided"),
        },
    }


@tool
def real_ocr_extract(image_base64: str) -> dict:
    """Extract structured claim data from an uploaded document image
    using GPT-4V vision. Returns the same schema as mock_ocr_extract.
    Requires OPENAI_API_KEY and USE_REAL_OCR=true in environment."""
    if not settings.USE_REAL_OCR:
        return {
            "success": False,
            "error": "Real OCR is disabled. Set USE_REAL_OCR=true in .env to enable.",
        }

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a medical document OCR system. Extract the following fields "
                        "from the uploaded healthcare claim form image and return them as JSON:\n"
                        "- member_id\n- patient_name\n- form_type\n- treatment_type\n"
                        "- treatment_date (YYYY-MM-DD)\n- practitioner_name\n- total_cost (number)\n"
                        "- signature_present (boolean)\n- procedure_code (number or null)\n"
                        "- clinical_indicator (string or null)\n- hospital_days (number or null)\n"
                        "- is_accident (boolean or null)\n- solicitor_involved (boolean or null)\n"
                        "Return ONLY valid JSON, no markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_base64}"},
                        }
                    ],
                },
            ],
            max_tokens=1000,
            timeout=settings.LLM_TIMEOUT,
        )

        import json

        extracted = json.loads(response.choices[0].message.content)
        return {
            "success": True,
            "extraction_method": "gpt4v_ocr",
            "extracted_data": extracted,
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR extraction failed: {str(e)}",
        }


# Export all tools
ocr_tools = [mock_ocr_extract, real_ocr_extract]
