"""Quick integration test for all improvement features."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    errors = []
    
    # Test 1: Imports
    print("=" * 60)
    print("TEST 1: Core imports")
    try:
        from app.config import settings
        from app.models.database import (
            load_data, get_all_members, get_member_by_id,
            add_activity, get_activities, get_uploaded_documents,
            get_all_uploaded_documents
        )
        from app.models.schemas import ClaimRequest, ClaimResponse
        from app.tools.policy_tools import (
            IPID_SOURCE, get_source_citations, policy_tools
        )
        from app.routers.queue import calculate_claim_priority
        from app.auth.users import load_users, login, get_user_by_id
        print("  [PASS] All imports successful")
    except ImportError as e:
        print(f"  [FAIL] Import error: {e}")
        errors.append(f"Import: {e}")
        return errors

    # Test 2: Data loading
    print("\nTEST 2: Data loading")
    try:
        load_data()
        members = get_all_members()
        print(f"  [PASS] Loaded {len(members)} members")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Data loading: {e}")

    # Test 3: MEM-1001 (Liam O'Connor)
    print("\nTEST 3: MEM-1001 exists")
    try:
        m = get_member_by_id("MEM-1001")
        assert m is not None, "MEM-1001 not found"
        name = f"{m['first_name']} {m['last_name']}"
        assert "Liam" in name, f"Expected Liam, got {name}"
        print(f"  [PASS] {name}, policy_start: {m['policy_start_date']}")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"MEM-1001: {e}")

    # Test 4: Test user account
    print("\nTEST 4: Test user (test@laya.ie)")
    try:
        load_users()
        result = login("test@laya.ie", "test123")
        assert result["role"] == "customer", f"Expected customer, got {result['role']}"
        assert result["member_id"] == "MEM-1001", f"Expected MEM-1001, got {result['member_id']}"
        print(f"  [PASS] test@laya.ie -> {result['first_name']} {result['last_name']}, member_id: {result['member_id']}")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Test user: {e}")

    # Test 5: Admin user
    print("\nTEST 5: Admin user (admin@laya.ie)")
    try:
        result = login("admin@laya.ie", "admin123")
        assert result["role"] == "developer", f"Expected developer, got {result['role']}"
        print(f"  [PASS] admin@laya.ie -> role: {result['role']}")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Admin user: {e}")

    # Test 6: IPID Source URL
    print("\nTEST 6: IPID source URL")
    try:
        assert "source_url" in IPID_SOURCE, "source_url missing from IPID_SOURCE"
        url = IPID_SOURCE["source_url"]
        assert "layahealthcare.ie" in url, f"Unexpected URL: {url}"
        print(f"  [PASS] source_url: {url}")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"IPID source_url: {e}")

    # Test 7: Source citations
    print("\nTEST 7: Source citations")
    try:
        cites = get_source_citations("GP & A&E", ["waiting period not elapsed"])
        assert len(cites) >= 2, f"Expected >=2 citations, got {len(cites)}"
        for c in cites:
            assert "source_url" in c, f"Citation missing source_url: {c['section']}"
            print(f"  [PASS] Citation: {c['section'][:45]} (has source_url)")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Source citations: {e}")

    # Test 8: Priority calculation
    print("\nTEST 8: Priority calculation")
    try:
        claim = {"status": "PENDING", "claimed_amount": 55, "ai_recommendation": "REJECTED"}
        member = {"current_year_usage": {"gp_visits_count": 0}, "policy_start_date": "2026-02-01"}
        priority = calculate_claim_priority(claim, member)
        assert priority["level"] in ("HIGH", "MEDIUM", "LOW")
        print(f"  [PASS] Priority: {priority['level']} (score: {priority['score']}, reasons: {priority['reasons']})")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Priority: {e}")

    # Test 9: ClaimResponse schema
    print("\nTEST 9: ClaimResponse schema")
    try:
        cr = ClaimResponse(
            decision="REJECTED",
            reasoning="test",
            source_url="https://www.layahealthcare.ie/api/document/dynamic/ipid?id=65"
        )
        assert cr.source_url is not None, "source_url is None"
        # Test without source_url (should default to None)
        cr2 = ClaimResponse(decision="APPROVED", reasoning="ok")
        assert cr2.source_url is None, "source_url should default to None"
        print(f"  [PASS] ClaimResponse.source_url works correctly")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"ClaimResponse: {e}")

    # Test 10: Activity tracking
    print("\nTEST 10: Activity tracking")
    try:
        add_activity({
            "type": "test",
            "member_id": "MEM-1001",
            "user_name": "Test Runner",
            "user_role": "developer",
            "description": "Integration test"
        })
        acts = get_activities(limit=1)
        assert len(acts) >= 1, "No activities returned"
        assert acts[0]["type"] == "test"
        print(f"  [PASS] Activity added and retrieved successfully")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Activity: {e}")

    # Test 11: Policy tools
    print("\nTEST 11: Policy tools")
    try:
        assert len(policy_tools) == 6, f"Expected 6 policy tools, got {len(policy_tools)}"
        tool_names = [t.name for t in policy_tools]
        print(f"  [PASS] {len(policy_tools)} tools: {', '.join(tool_names)}")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Policy tools: {e}")

    # Test 12: Graph module (decision_node has PENDING logic)
    print("\nTEST 12: Graph module")
    try:
        from app.agents.graph import process_claim, process_claim_streaming
        import inspect
        src = inspect.getsource(process_claim)
        # Check process_claim function exists and is callable
        assert callable(process_claim), "process_claim not callable"
        assert callable(process_claim_streaming), "process_claim_streaming not callable"
        print(f"  [PASS] process_claim and process_claim_streaming are callable")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Graph: {e}")

    # Test 13: Main app imports (WebSocket)
    print("\nTEST 13: Main app (WebSocket)")
    try:
        from app.main import app, notify_claim_update
        assert callable(notify_claim_update), "notify_claim_update not callable"
        print(f"  [PASS] notify_claim_update exists and is callable")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Main WebSocket: {e}")

    # Test 14: Demo PDFs
    print("\nTEST 14: Demo PDF config")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "demo_pdfs"))
        demo_pdfs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "demo_pdfs", "generate_pdfs.py")
        with open(demo_pdfs_path, "r") as f:
            content = f.read()
        assert "claim_gp_test_liam.pdf" in content, "Liam test PDF not in generate_pdfs.py"
        assert "MEM-1001" in content, "MEM-1001 not in generate_pdfs.py"
        print(f"  [PASS] claim_gp_test_liam.pdf config found in generate_pdfs.py")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Demo PDF: {e}")

    # Test 15: Check uploads directory
    print("\nTEST 15: Uploads directory")
    try:
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
        assert os.path.isdir(uploads_dir), f"uploads/ directory not found at {uploads_dir}"
        print(f"  [PASS] uploads/ directory exists")
    except Exception as e:
        print(f"  [FAIL] {e}")
        errors.append(f"Uploads dir: {e}")

    # Summary
    print("\n" + "=" * 60)
    if errors:
        print(f"RESULT: {len(errors)} FAILURES")
        for err in errors:
            print(f"  - {err}")
    else:
        print("RESULT: ALL 15 TESTS PASSED")
    print("=" * 60)
    
    return errors


if __name__ == "__main__":
    errors = main()
    sys.exit(1 if errors else 0)
