"""
Generate sample Laya Healthcare claim form PDFs for demo purposes.
These PDFs simulate realistic Out-patient Claim Forms that can be
uploaded to the Laya AI Claims Chatbot for testing.
"""

from fpdf import FPDF
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


class ClaimFormPDF(FPDF):
    """Styled Laya Healthcare claim form PDF."""

    def header(self):
        # Laya teal header bar
        self.set_fill_color(0, 169, 157)  # Laya teal
        self.rect(0, 0, 210, 28, "F")
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(255, 255, 255)
        self.set_y(6)
        self.cell(0, 10, "LAYA HEALTHCARE", align="L")
        self.set_font("Helvetica", "", 10)
        self.set_y(16)
        self.cell(0, 6, "Money Smart Out-patient Claim Form", align="L")
        self.ln(20)

    def footer(self):
        self.set_y(-20)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, "Laya Healthcare Limited, trading as Laya Healthcare, is regulated by the Central Bank of Ireland.", align="C")
        self.ln(4)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}} | DEMO DOCUMENT - FOR TESTING PURPOSES ONLY", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(0, 169, 157)
        self.set_fill_color(240, 249, 248)
        self.cell(0, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def field_row(self, label, value, bold_value=False):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(55, 7, label + ":", new_x="END")
        self.set_font("Helvetica", "B" if bold_value else "", 9)
        self.set_text_color(26, 43, 74)  # Laya navy
        self.cell(0, 7, str(value), new_x="LMARGIN", new_y="NEXT")

    def checkbox_row(self, label, checked=False):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 80)
        box = "[X]" if checked else "[  ]"
        self.cell(55, 7, label + ":", new_x="END")
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(26, 43, 74)
        self.cell(0, 7, box + (" Yes" if checked else " No"), new_x="LMARGIN", new_y="NEXT")

    def signature_line(self, name, signed=True):
        self.ln(5)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(55, 7, "Member Signature:", new_x="END")
        if signed:
            self.set_font("Helvetica", "BI", 14)
            self.set_text_color(26, 43, 74)
            self.cell(0, 7, name, new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_draw_color(200, 200, 200)
            x = self.get_x() + 55
            y = self.get_y() + 6
            self.line(x, y, x + 80, y)
            self.ln(7)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, "I declare that the information given on this form is correct and complete.", new_x="LMARGIN", new_y="NEXT")


def generate_claim_pdf(filename, data):
    """Generate a single claim form PDF."""
    pdf = ClaimFormPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    # Section 1: Member Details
    pdf.section_title("SECTION 1: MEMBER DETAILS")
    pdf.field_row("Member ID", data["member_id"], bold_value=True)
    pdf.field_row("Patient Name", data["patient_name"], bold_value=True)
    pdf.field_row("Date of Birth", data.get("dob", "N/A"))
    pdf.field_row("Address", data.get("address", "N/A"))
    pdf.field_row("Eircode", data.get("eircode", "N/A"))
    pdf.field_row("Scheme", "Money Smart 20 Family")
    pdf.ln(4)

    # Section 2: Treatment Details
    pdf.section_title("SECTION 2: TREATMENT DETAILS")
    pdf.field_row("Form Type", data.get("form_type", "Money Smart Out-patient Claim Form"))
    pdf.field_row("Treatment Type", data["treatment_type"], bold_value=True)
    pdf.field_row("Treatment Date", data["treatment_date"], bold_value=True)
    pdf.field_row("Practitioner / Provider", data["practitioner_name"])
    pdf.field_row("Practitioner Address", data.get("practitioner_address", "N/A"))
    if data.get("procedure_code"):
        pdf.field_row("Procedure Code", data["procedure_code"])
    if data.get("clinical_indicator"):
        pdf.field_row("Clinical Indicator", data["clinical_indicator"])
    if data.get("hospital_days"):
        pdf.field_row("Number of Days", data["hospital_days"])
    pdf.ln(4)

    # Section 3: Financial Details
    pdf.section_title("SECTION 3: FINANCIAL DETAILS")
    pdf.field_row("Total Cost (EUR)", f"EUR {data['total_cost']:.2f}", bold_value=True)
    pdf.field_row("Receipt Attached", "Yes")
    pdf.field_row("Payment Method", data.get("payment_method", "EFT to registered IBAN"))
    pdf.field_row("IBAN (last 4)", data.get("iban_last4", "****"))
    pdf.ln(4)

    # Section 4: Additional Information
    if data.get("is_accident") is not None or data.get("solicitor_involved") is not None:
        pdf.section_title("SECTION 4: ACCIDENT / THIRD PARTY DETAILS")
        pdf.checkbox_row("Related to accident or injury", data.get("is_accident", False))
        pdf.checkbox_row("Claiming through Solicitor/PIAB", data.get("solicitor_involved", False))
        if data.get("is_accident"):
            pdf.field_row("Accident Description", data.get("accident_desc", "Road traffic accident"))
        pdf.ln(4)

    # Section 5: Declaration & Signature
    pdf.section_title("SECTION 5: DECLARATION")
    pdf.signature_line(data["patient_name"], signed=data.get("signature_present", True))

    # Save
    path = os.path.join(OUTPUT_DIR, filename)
    pdf.output(path)
    print(f"  Created: {path}")


# ──────────────────────────────────────────────
# Define the 5 main demo claim forms
# ──────────────────────────────────────────────

DEMO_CLAIMS = [
    # Scenario 1: Waiting Period Rejection
    {
        "filename": "claim_gp_visit_liam.pdf",
        "data": {
            "member_id": "MEM-1001",
            "patient_name": "Liam O'Connor",
            "dob": "1990-03-14",
            "address": "12 Baggot Street Lower, Dublin",
            "eircode": "D02 XY45",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "GP & A&E",
            "treatment_date": "2026-02-20",
            "practitioner_name": "Dr. Hibbert",
            "practitioner_address": "Medical Centre, Baggot Street, Dublin 2",
            "total_cost": 60.00,
            "iban_last4": "4501",
            "signature_present": True,
        },
    },
    # Scenario 2: Quarterly Threshold Approval
    {
        "filename": "claim_consultant_siobhan.pdf",
        "data": {
            "member_id": "MEM-1002",
            "patient_name": "Siobhan Kelly",
            "dob": "1985-07-22",
            "address": "7 Patrick Street, Cork",
            "eircode": "T12 AB34",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "Consultant Fee",
            "treatment_date": "2026-02-15",
            "practitioner_name": "Dr. Nick Riviera",
            "practitioner_address": "Cork University Hospital, Wilton, Cork",
            "total_cost": 60.00,
            "iban_last4": "5602",
            "signature_present": True,
        },
    },
    # Scenario 3: Annual Limit Exceeded
    {
        "filename": "claim_scan_declan.pdf",
        "data": {
            "member_id": "MEM-1003",
            "patient_name": "Declan Murphy",
            "dob": "1978-11-30",
            "address": "22 Shop Street, Galway",
            "eircode": "H91 CD56",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "Scan Cover",
            "treatment_date": "2026-02-10",
            "practitioner_name": "Beacon Hospital",
            "practitioner_address": "Beacon Court, Sandyford, Dublin 18",
            "total_cost": 200.00,
            "iban_last4": "6703",
            "signature_present": True,
        },
    },
    # Scenario 4: Duplicate Claim / Fraud Detection
    {
        "filename": "claim_consultant_conor.pdf",
        "data": {
            "member_id": "MEM-1005",
            "patient_name": "Conor Walsh",
            "dob": "1988-09-17",
            "address": "3 Grafton Street, Dublin",
            "eircode": "D02 GH90",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "Consultant Fee",
            "treatment_date": "2026-01-15",
            "practitioner_name": "Dr. Sarah Smith",
            "practitioner_address": "Blackrock Clinic, Rock Road, Dublin",
            "total_cost": 150.00,
            "iban_last4": "8905",
            "signature_present": True,
        },
    },
    # Scenario 5: Hospital Stay (Partial Approval)
    {
        "filename": "claim_hospital_aoife.pdf",
        "data": {
            "member_id": "MEM-1004",
            "patient_name": "Aoife Byrne",
            "dob": "1992-05-08",
            "address": "15 O'Connell Street, Limerick",
            "eircode": "V94 EF78",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "Hospital In-patient",
            "treatment_date": "2026-02-01",
            "practitioner_name": "St. Vincent's University Hospital",
            "practitioner_address": "Elm Park, Dublin 4",
            "total_cost": 100.00,
            "hospital_days": 5,
            "iban_last4": "7804",
            "signature_present": True,
        },
    },
    # Bonus Scenario: Maternity
    {
        "filename": "claim_maternity_niamh.pdf",
        "data": {
            "member_id": "MEM-1008",
            "patient_name": "Niamh Brennan",
            "dob": "1993-12-11",
            "address": "19 Eyre Square, Galway",
            "eircode": "H91 MN56",
            "form_type": "Pre and Post-Natal Claim Form",
            "treatment_type": "Maternity / Adoption Cash Back",
            "treatment_date": "2026-01-25",
            "practitioner_name": "University Hospital Galway",
            "practitioner_address": "Newcastle Road, Galway",
            "total_cost": 1500.00,
            "iban_last4": "1208",
            "signature_present": True,
        },
    },
    # NEW: Test User GP Claim Receipt (for improved demo flow)
    {
        "filename": "claim_gp_test_liam.pdf",
        "data": {
            "member_id": "MEM-1001",
            "patient_name": "Liam O'Connor",
            "dob": "1990-03-14",
            "address": "12 Baggot Street Lower, Dublin",
            "eircode": "D02 XY45",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "GP & A&E",
            "treatment_date": "2026-02-20",
            "practitioner_name": "Dr. Sarah Murphy",
            "practitioner_address": "Baggot Street Medical Centre, Dublin 2",
            "total_cost": 55.00,
            "iban_last4": "4501",
            "payment_method": "Paid by Debit Card",
            "signature_present": True,
        },
    },
    # Bonus Scenario: Third-party / Solicitor
    {
        "filename": "claim_accident_sean.pdf",
        "data": {
            "member_id": "MEM-1009",
            "patient_name": "Sean Gallagher",
            "dob": "1975-04-19",
            "address": "31 Quay Street, Kilkenny",
            "eircode": "R95 OP78",
            "form_type": "Money Smart Out-patient Claim Form",
            "treatment_type": "Hospital In-patient",
            "treatment_date": "2026-02-10",
            "practitioner_name": "St. James's Hospital",
            "practitioner_address": "James's Street, Dublin 8",
            "total_cost": 250.00,
            "hospital_days": 3,
            "iban_last4": "2309",
            "is_accident": True,
            "solicitor_involved": True,
            "accident_desc": "Road traffic accident on N7 motorway",
            "signature_present": True,
        },
    },
]


if __name__ == "__main__":
    print("=" * 50)
    print("Laya Healthcare — Demo PDF Claim Form Generator")
    print("=" * 50)
    print()

    for claim in DEMO_CLAIMS:
        generate_claim_pdf(claim["filename"], claim["data"])

    print()
    print(f"Done! {len(DEMO_CLAIMS)} PDFs generated in: {OUTPUT_DIR}")
    print()
    print("Files:")
    for claim in DEMO_CLAIMS:
        print(f"  - {claim['filename']}")
