#!/usr/bin/env python3
"""
scripts/verify_ingestion.py
=============================================================================
Automated Verification Suite for CMA Part 2 Database Ingestion
Validates counts, non-null fields, foreign keys, and distractor integrity.
Exits with code 0 on success, code 1 on any assertion failure.
=============================================================================
"""

import argparse
import os
import sqlite3
import sys
import time

def verify_database(db_path: str, verbose: bool = True) -> bool:
    t0 = time.perf_counter()
    if not os.path.exists(db_path):
        print(f"[FAIL] Database file does not exist: {db_path}", file=sys.stderr)
        return False

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    failures = []

    def check(name: str, passed: bool, details: str = ""):
        if passed:
            if verbose:
                print(f"  [PASS] {name} {details}")
        else:
            print(f"  [FAIL] {name} {details}", file=sys.stderr)
            failures.append(f"{name}: {details}")

    if verbose:
        print(f"\n=======================================================")
        print(f"Starting CMA Part 2 Database Ingestion Verification")
        print(f"Target Database: {db_path}")
        print(f"=======================================================\n")

    # 1. Foreign Key Integrity
    cur.execute("PRAGMA foreign_keys = ON;")
    fk_errors = cur.execute("PRAGMA foreign_key_check;").fetchall()
    check("Foreign Key Integrity", len(fk_errors) == 0, f"({len(fk_errors)} violations)")

    # 2. Section Assertions
    sec_count = cur.execute("SELECT count(*) FROM Section").fetchone()[0]
    check("Section Count", sec_count == 6, f"(Found: {sec_count}, Expected: 6)")
    
    total_weight = cur.execute("SELECT sum(weight) FROM Section").fetchone()[0]
    check("Section Total Weight", total_weight == 100, f"(Sum: {total_weight}%, Expected: 100%)")

    # 3. Unit Assertions
    unit_count = cur.execute("SELECT count(*) FROM Unit").fetchone()[0]
    check("Unit Count", unit_count == 15, f"(Found: {unit_count}, Expected: 15)")

    # 4. Subunit Assertions
    sub_count = cur.execute("SELECT count(*) FROM Subunit").fetchone()[0]
    check("Subunit Count", sub_count == 57, f"(Found: {sub_count}, Expected: 57)")

    # 5. Category Assertions
    cat_count = cur.execute("SELECT count(*) FROM Category").fetchone()[0]
    check("Category Count", cat_count == 222, f"(Found: {cat_count}, Expected: 222)")

    # 6. Question Bank Assertions
    q_count = cur.execute("SELECT count(*) FROM Question").fetchone()[0]
    check("Question Count", q_count == 7609, f"(Found: {q_count}, Expected: 7609)")

    p2_only = cur.execute("SELECT count(*) FROM Question WHERE part != 2").fetchone()[0]
    check("Part 2 Isolation", p2_only == 0, f"({p2_only} questions have part != 2)")

    null_stems = cur.execute("SELECT count(*) FROM Question WHERE stem IS NULL OR trim(stem) = ''").fetchone()[0]
    check("Question Stems Non-Null", null_stems == 0, f"({null_stems} empty stems)")

    null_exps = cur.execute("SELECT count(*) FROM Question WHERE explanation IS NULL OR trim(explanation) = ''").fetchone()[0]
    check("Question Explanations Non-Null", null_exps == 0, f"({null_exps} empty explanations)")

    invalid_answers = cur.execute("SELECT count(*) FROM Question WHERE correctChoice NOT IN ('A','B','C','D')").fetchone()[0]
    check("Correct Choices Valid (A..D)", invalid_answers == 0, f"({invalid_answers} invalid keys)")

    flagged_count = cur.execute("SELECT count(*) FROM Question WHERE isFlagged = 1").fetchone()[0]
    check("Flagged Question Count", flagged_count == 8, f"(Found: {flagged_count}, Expected: 8)")

    # 7. Choice & Distractor Assertions
    choice_count = cur.execute("SELECT count(*) FROM Choice").fetchone()[0]
    check("Total Choices Count", choice_count == 30436, f"(Found: {choice_count}, Expected: 30436 [7609 * 4])")

    single_correct = cur.execute("""
        SELECT count(*) FROM (
            SELECT questionId, sum(isCorrect) as correct_count 
            FROM Choice 
            GROUP BY questionId 
            HAVING correct_count != 1
        )
    """).fetchone()[0]
    check("Single Correct Choice Per Question", single_correct == 0, f"({single_correct} questions without exactly 1 correct choice)")

    dist_count = cur.execute("SELECT count(*) FROM Choice WHERE distractorAnalysis IS NOT NULL").fetchone()[0]
    check("Distractor Analyses Ingested", dist_count >= 13150, f"(Found: {dist_count}, Expected: >= 13150)")

    correct_with_dist = cur.execute("SELECT count(*) FROM Choice WHERE isCorrect = 1 AND distractorAnalysis IS NOT NULL").fetchone()[0]
    check("Correct Choices Free of Distractor Analysis", correct_with_dist == 0, f"({correct_with_dist} correct choices have distractor analysis)")

    # 8. Prometric Mock Exam Assertions
    mock_count = cur.execute("SELECT count(*) FROM MockExam").fetchone()[0]
    check("Mock Exam Count", mock_count == 31, f"(Found: {mock_count}, Expected: 31)")

    mock_q_count = cur.execute("SELECT count(*) FROM MockExamQuestion").fetchone()[0]
    check("Mock Exam Question Mappings", mock_q_count == 3100, f"(Found: {mock_q_count}, Expected: 3100 [31 * 100])")

    invalid_mock_size = cur.execute("""
        SELECT count(*) FROM (
            SELECT mockId, count(*) as cnt 
            FROM MockExamQuestion 
            GROUP BY mockId 
            HAVING cnt != 100
        )
    """).fetchone()[0]
    check("All Mock Exams Contain Exactly 100 Questions", invalid_mock_size == 0, f"({invalid_mock_size} mocks have != 100 questions)")

    # 9. CBQ Assertions
    cbq_case_count = cur.execute("SELECT count(*) FROM CbqCase").fetchone()[0]
    check("CBQ Case Count", cbq_case_count == 109, f"(Found: {cbq_case_count}, Expected: 109)")

    cbq_item_count = cur.execute("SELECT count(*) FROM CbqItem").fetchone()[0]
    check("CBQ Item Count", cbq_item_count == 581, f"(Found: {cbq_item_count}, Expected: 581)")

    # 10. Formula Center Assertions
    sheet_count = cur.execute("SELECT count(*) FROM Formula WHERE isCheatSheet = 1").fetchone()[0]
    check("Formula Cheat Sheet Count", sheet_count == 85, f"(Found: {sheet_count}, Expected: 85)")

    lib_count = cur.execute("SELECT count(*) FROM Formula WHERE isLibrary = 1").fetchone()[0]
    check("Formula Library Count", lib_count == 217, f"(Found: {lib_count}, Expected: 217)")

    total_formulas = cur.execute("SELECT count(*) FROM Formula").fetchone()[0]
    check("Total Formulas Ingested", total_formulas == 302, f"(Found: {total_formulas}, Expected: 302 [85 + 217])")

    # 11. Performance Regression Benchmark
    t_perf0 = time.perf_counter()
    sample_quiz = cur.execute("""
        SELECT q.id, q.stem, q.correctChoice, q.explanation, c.choiceKey, c.content, c.distractorAnalysis
        FROM Question q
        JOIN Choice c ON q.id = c.questionId
        WHERE q.subunitId = '2.1.1'
        ORDER BY q.sequenceNum ASC
        LIMIT 80;
    """).fetchall()
    t_perf1 = time.perf_counter()
    check("Random 20-Question Query Latency < 10ms", (t_perf1 - t_perf0) < 0.010, f"({(t_perf1 - t_perf0)*1000:.2f}ms)")

    conn.close()
    t_total = time.perf_counter() - t0

    if verbose:
        print(f"\n-------------------------------------------------------")
        print(f"Verification completed in {t_total:.3f}s. Total checks: {18 - len(failures)} Passed, {len(failures)} Failed.")
        print(f"-------------------------------------------------------\n")

    return len(failures) == 0

def main():
    parser = argparse.ArgumentParser(description="Verify CMA Part 2 SQLite Database Ingestion")
    parser.add_argument("--db-path", default=r"c:\Users\HNBV12989\TCI HOSPITAL\2026\21. AI\App\cma_passq_web\prisma\dev.db", help="Path to SQLite database to verify")
    args = parser.parse_args()

    success = verify_database(args.db_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
